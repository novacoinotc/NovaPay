import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb, deposits, wallets } from "@novapay/db";
import { eq, desc, and, gte, lte, sql } from "@novapay/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "No autorizado" } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const status = searchParams.get("status");

    const db = getDb();

    // Build conditions
    const conditions = [eq(deposits.merchantId, session.user.id)];
    if (status) {
      conditions.push(eq(deposits.status, status as any));
    }

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(deposits)
      .where(and(...conditions));

    // Get deposits with pagination
    const merchantDeposits = await db
      .select({
        id: deposits.id,
        txHash: deposits.txHash,
        network: deposits.network,
        asset: deposits.asset,
        amountCrypto: deposits.amountCrypto,
        amountMxn: deposits.amountMxn,
        exchangeRate: deposits.exchangeRate,
        spreadPercent: deposits.spreadPercent,
        status: deposits.status,
        confirmations: deposits.confirmations,
        detectedAt: deposits.detectedAt,
        confirmedAt: deposits.confirmedAt,
        creditedAt: deposits.creditedAt,
      })
      .from(deposits)
      .where(and(...conditions))
      .orderBy(desc(deposits.detectedAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return NextResponse.json({
      success: true,
      data: {
        items: merchantDeposits,
        total: Number(count),
        page,
        pageSize,
        hasMore: page * pageSize < Number(count),
      },
    });
  } catch (error) {
    console.error("Error fetching deposits:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Error interno" } },
      { status: 500 }
    );
  }
}
