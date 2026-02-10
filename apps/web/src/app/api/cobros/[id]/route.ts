import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb, paymentOrders, wallets, eq, and } from "@novapay/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "No autorizado" } },
        { status: 401 }
      );
    }

    const db = getDb();

    const [order] = await db
      .select({
        id: paymentOrders.id,
        merchantId: paymentOrders.merchantId,
        amountMxn: paymentOrders.amountMxn,
        tipMxn: paymentOrders.tipMxn,
        totalMxn: paymentOrders.totalMxn,
        amountUsdt: paymentOrders.amountUsdt,
        exchangeRate: paymentOrders.exchangeRate,
        spread: paymentOrders.spread,
        status: paymentOrders.status,
        depositId: paymentOrders.depositId,
        expiresAt: paymentOrders.expiresAt,
        paidAt: paymentOrders.paidAt,
        createdAt: paymentOrders.createdAt,
        walletAddress: wallets.address,
        walletNetwork: wallets.network,
      })
      .from(paymentOrders)
      .leftJoin(wallets, eq(paymentOrders.walletId, wallets.id))
      .where(eq(paymentOrders.id, params.id))
      .limit(1);

    if (!order) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Orden no encontrada" } },
        { status: 404 }
      );
    }

    // Verificar que pertenezca al merchant
    if (order.merchantId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "No autorizado" } },
        { status: 403 }
      );
    }

    // Lazy expiration: si está PENDING y ya expiró, marcar como EXPIRED
    if (order.status === "PENDING" && order.expiresAt && new Date(order.expiresAt) < new Date()) {
      await db
        .update(paymentOrders)
        .set({ status: "EXPIRED", updatedAt: new Date() })
        .where(eq(paymentOrders.id, order.id));

      return NextResponse.json({
        success: true,
        data: { ...order, status: "EXPIRED" },
      });
    }

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("Error fetching payment order:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Error interno" } },
      { status: 500 }
    );
  }
}
