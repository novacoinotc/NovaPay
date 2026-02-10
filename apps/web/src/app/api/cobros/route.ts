import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb, merchants, wallets, paymentOrders, employees, eq, desc, and } from "@novapay/db";
import { getQuote } from "@novapay/crypto";
import { calculateUsdtFromMxn, BUSINESS_RULES, CryptoAsset } from "@novapay/shared";
import { z } from "zod";

const createOrderSchema = z.object({
  amountMxn: z
    .number()
    .min(BUSINESS_RULES.MIN_PAYMENT_ORDER_MXN, `Mínimo $${BUSINESS_RULES.MIN_PAYMENT_ORDER_MXN} MXN`)
    .max(BUSINESS_RULES.MAX_PAYMENT_ORDER_MXN, `Máximo $${BUSINESS_RULES.MAX_PAYMENT_ORDER_MXN} MXN`),
  tipMxn: z.number().min(0).default(0),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "No autorizado" } },
        { status: 401 }
      );
    }

    const db = getDb();
    const body = await request.json();
    const { amountMxn, tipMxn } = createOrderSchema.parse(body);

    // Verificar merchant activo
    const [merchant] = await db
      .select()
      .from(merchants)
      .where(eq(merchants.id, session.user.id))
      .limit(1);

    if (!merchant || merchant.status !== "ACTIVE") {
      return NextResponse.json(
        { success: false, error: { code: "MERCHANT_INACTIVE", message: "Cuenta no activa" } },
        { status: 403 }
      );
    }

    // Obtener wallet TRON activa del merchant
    const [wallet] = await db
      .select()
      .from(wallets)
      .where(
        and(
          eq(wallets.merchantId, session.user.id),
          eq(wallets.network, "TRON"),
          eq(wallets.asset, "USDT_TRC20"),
          eq(wallets.isActive, true)
        )
      )
      .limit(1);

    if (!wallet) {
      return NextResponse.json(
        { success: false, error: { code: "NO_WALLET", message: "No tienes wallet TRON activa" } },
        { status: 400 }
      );
    }

    // Obtener quote actual
    const quote = await getQuote("USDT_TRC20" as CryptoAsset);
    const spreadPercent = parseFloat(merchant.spreadPercent);
    const totalMxn = amountMxn + tipMxn;

    // Calcular USDT necesario
    const { amountUsdt, effectiveRate } = calculateUsdtFromMxn(
      totalMxn,
      quote.priceMxn,
      spreadPercent
    );

    // Crear orden con expiración
    const expiresAt = new Date(
      Date.now() + BUSINESS_RULES.PAYMENT_ORDER_EXPIRY_MINUTES * 60 * 1000
    );

    const [order] = await db
      .insert(paymentOrders)
      .values({
        merchantId: session.user.id,
        walletId: wallet.id,
        amountMxn: amountMxn.toFixed(2),
        tipMxn: tipMxn.toFixed(2),
        totalMxn: totalMxn.toFixed(2),
        amountUsdt: amountUsdt.toFixed(6),
        exchangeRate: quote.priceMxn.toFixed(6),
        spread: spreadPercent.toFixed(2),
        expiresAt,
        employeeId: session.user.employeeId || null,
      })
      .returning();

    console.log(`Payment order created: ${order.id} - $${totalMxn} MXN = ${amountUsdt.toFixed(6)} USDT${session.user.employeeId ? ` by employee ${session.user.employeeName}` : ""}`);

    return NextResponse.json({
      success: true,
      data: {
        ...order,
        walletAddress: wallet.address,
        walletNetwork: wallet.network,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: error.errors[0].message } },
        { status: 400 }
      );
    }

    console.error("Error creating payment order:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Error interno" } },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "No autorizado" } },
        { status: 401 }
      );
    }

    const db = getDb();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const status = searchParams.get("status");
    const employeeFilter = searchParams.get("employeeId");
    const offset = (page - 1) * pageSize;

    // Build where conditions
    const conditions = [eq(paymentOrders.merchantId, session.user.id)];

    if (status) {
      conditions.push(eq(paymentOrders.status, status as any));
    }

    // Si es empleado CASHIER, solo ver sus propios cobros
    if (session.user.employeeId && session.user.employeeRole === "CASHIER") {
      conditions.push(eq(paymentOrders.employeeId, session.user.employeeId));
    } else if (employeeFilter) {
      // Owner or MANAGER filtering by specific employee
      conditions.push(eq(paymentOrders.employeeId, employeeFilter));
    }

    const orders = await db
      .select({
        id: paymentOrders.id,
        amountMxn: paymentOrders.amountMxn,
        tipMxn: paymentOrders.tipMxn,
        totalMxn: paymentOrders.totalMxn,
        amountUsdt: paymentOrders.amountUsdt,
        exchangeRate: paymentOrders.exchangeRate,
        status: paymentOrders.status,
        expiresAt: paymentOrders.expiresAt,
        paidAt: paymentOrders.paidAt,
        createdAt: paymentOrders.createdAt,
        walletAddress: wallets.address,
        employeeId: paymentOrders.employeeId,
        employeeName: employees.name,
      })
      .from(paymentOrders)
      .leftJoin(wallets, eq(paymentOrders.walletId, wallets.id))
      .leftJoin(employees, eq(paymentOrders.employeeId, employees.id))
      .where(and(...conditions))
      .orderBy(desc(paymentOrders.createdAt))
      .limit(pageSize)
      .offset(offset);

    return NextResponse.json({
      success: true,
      data: { orders, page, pageSize },
    });
  } catch (error) {
    console.error("Error fetching payment orders:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Error interno" } },
      { status: 500 }
    );
  }
}
