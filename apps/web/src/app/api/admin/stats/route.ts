import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb, merchants, deposits, withdrawals, count, sum, eq, sql, and, gte } from "@novapay/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "No autorizado" } },
        { status: 403 }
      );
    }

    const db = getDb();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Run all queries in parallel
    const [
      [merchantCount],
      [totalBalance],
      [totalDeposits],
      [totalWithdrawals],
      [depositsToday],
      [withdrawalsToday],
      [pendingDeposits],
    ] = await Promise.all([
      db.select({ total: count() }).from(merchants),
      db.select({ total: sum(merchants.balanceMxn) }).from(merchants),
      db.select({ total: count() }).from(deposits),
      db.select({ total: count() }).from(withdrawals),
      db
        .select({ total: count() })
        .from(deposits)
        .where(gte(deposits.detectedAt, todayStart)),
      db
        .select({ total: count() })
        .from(withdrawals)
        .where(gte(withdrawals.requestedAt, todayStart)),
      db
        .select({ total: count() })
        .from(deposits)
        .where(eq(deposits.status, "PENDING")),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalMerchants: merchantCount.total,
        totalBalanceMxn: totalBalance.total || "0.00",
        totalDeposits: totalDeposits.total,
        totalWithdrawals: totalWithdrawals.total,
        depositsToday: depositsToday.total,
        withdrawalsToday: withdrawalsToday.total,
        pendingDeposits: pendingDeposits.total,
      },
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Error interno" } },
      { status: 500 }
    );
  }
}
