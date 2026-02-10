import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, deposits, merchants, paymentOrders } from "@novapay/db";
import { eq, and, sql, gte } from "@novapay/db";
import { getQuote } from "@novapay/crypto";
import { calculateMxnAmount, CryptoAsset, BUSINESS_RULES } from "@novapay/shared";
import { SpeiService } from "@/lib/services/spei-service";

// Schema de validación para depósito confirmado
const depositConfirmedSchema = z.object({
  depositId: z.string().uuid(),
  txHash: z.string(),
  confirmations: z.number(),
});

export async function POST(request: NextRequest) {
  try {
    // Verificar API key interno
    const apiKey = request.headers.get("x-internal-api-key");
    if (apiKey !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Invalid API key" } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const data = depositConfirmedSchema.parse(body);

    const db = getDb();

    // Buscar el depósito
    const [deposit] = await db
      .select()
      .from(deposits)
      .where(eq(deposits.id, data.depositId))
      .limit(1);

    if (!deposit) {
      return NextResponse.json(
        { success: false, error: { code: "DEPOSIT_NOT_FOUND", message: "Deposit not found" } },
        { status: 404 }
      );
    }

    // Si ya fue acreditado, no hacer nada
    if (deposit.status === "CREDITED" || deposit.amountMxn) {
      return NextResponse.json({
        success: true,
        data: {
          message: `Deposit already credited`,
          status: deposit.status,
        },
      });
    }

    // Obtener comercio para spread
    const [merchant] = await db
      .select()
      .from(merchants)
      .where(eq(merchants.id, deposit.merchantId))
      .limit(1);

    if (!merchant) {
      return NextResponse.json(
        { success: false, error: { code: "MERCHANT_NOT_FOUND", message: "Merchant not found" } },
        { status: 404 }
      );
    }

    // Obtener precio actual y calcular MXN
    const quote = await getQuote(deposit.asset as CryptoAsset);
    const spreadPercent = parseFloat(merchant.spreadPercent);
    const { netMxn } = calculateMxnAmount(
      deposit.amountCrypto,
      quote.priceMxn,
      spreadPercent
    );

    // Actualizar depósito: CONFIRMED + acreditar MXN
    await db
      .update(deposits)
      .set({
        status: "CREDITED",
        confirmations: data.confirmations,
        confirmedAt: new Date(),
        creditedAt: new Date(),
        amountMxn: netMxn.toFixed(2),
        exchangeRate: quote.priceMxn.toFixed(6),
        spreadPercent: spreadPercent.toFixed(2),
      })
      .where(eq(deposits.id, data.depositId));

    // Incrementar balance del comercio
    await db
      .update(merchants)
      .set({
        balanceMxn: sql`${merchants.balanceMxn} + ${netMxn.toFixed(2)}`,
        updatedAt: new Date(),
      })
      .where(eq(merchants.id, merchant.id));

    console.log(`Deposit ${data.depositId} confirmed + credited ${netMxn.toFixed(2)} MXN to merchant ${merchant.id}`);

    // Buscar payment order pendiente que coincida con este depósito
    try {
      const tolerancePercent = BUSINESS_RULES.PAYMENT_ORDER_TOLERANCE_PERCENT / 100;
      const depositAmountUsdt = parseFloat(deposit.amountCrypto);

      const pendingOrders = await db
        .select()
        .from(paymentOrders)
        .where(
          and(
            eq(paymentOrders.walletId, deposit.walletId),
            eq(paymentOrders.status, "PENDING"),
            gte(paymentOrders.expiresAt, new Date())
          )
        )
        .orderBy(paymentOrders.createdAt);

      for (const order of pendingOrders) {
        const orderUsdt = parseFloat(order.amountUsdt);
        const lowerBound = orderUsdt * (1 - tolerancePercent);
        const upperBound = orderUsdt * (1 + tolerancePercent);

        if (depositAmountUsdt >= lowerBound && depositAmountUsdt <= upperBound) {
          await db
            .update(paymentOrders)
            .set({
              status: "PAID",
              depositId: data.depositId,
              paidAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(paymentOrders.id, order.id));

          console.log(`Payment order ${order.id} matched to deposit ${data.depositId} (${depositAmountUsdt} USDT ~ ${orderUsdt} USDT)`);
          break;
        }
      }
    } catch (matchError) {
      console.error("Error matching payment order:", matchError);
    }

    // Si tiene auto-SPEI activado, crear retiro automático
    if (merchant.autoSpeiEnabled) {
      console.log(`Auto-SPEI enabled for merchant ${merchant.id}, creating withdrawal...`);

      const { CreditService } = await import("@/lib/services/credit-service");

      const withdrawalResult = await CreditService.processWithdrawal(
        merchant.id,
        netMxn
      );

      if (withdrawalResult.success && withdrawalResult.withdrawalId) {
        await SpeiService.processWithdrawal(withdrawalResult.withdrawalId);
        console.log(`Auto-SPEI withdrawal ${withdrawalResult.withdrawalId} sent to NovaCore`);
      } else {
        console.warn(`Auto-SPEI failed for merchant ${merchant.id}: ${withdrawalResult.error}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        depositId: data.depositId,
        status: "CREDITED",
        confirmations: data.confirmations,
        amountMxn: netMxn.toFixed(2),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: error.message },
        },
        { status: 400 }
      );
    }

    console.error("Error processing deposit confirmation:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
      },
      { status: 500 }
    );
  }
}
