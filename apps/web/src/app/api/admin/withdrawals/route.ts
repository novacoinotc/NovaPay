import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb, withdrawals, merchants, eq, desc, sql, and, count } from "@novapay/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "No autorizado" } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const status = searchParams.get("status") || "";
    const offset = (page - 1) * limit;

    const db = getDb();

    const conditions = [];
    if (status) {
      conditions.push(eq(withdrawals.status, status as any));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const withdrawalList = await db
      .select({
        id: withdrawals.id,
        merchantId: withdrawals.merchantId,
        amountMxn: withdrawals.amountMxn,
        feeMxn: withdrawals.feeMxn,
        netAmountMxn: withdrawals.netAmountMxn,
        clabe: withdrawals.clabe,
        beneficiaryName: withdrawals.beneficiaryName,
        speiReference: withdrawals.speiReference,
        speiTrackingId: withdrawals.speiTrackingId,
        status: withdrawals.status,
        failureReason: withdrawals.failureReason,
        requestedAt: withdrawals.requestedAt,
        processedAt: withdrawals.processedAt,
        merchantName: merchants.businessName,
        merchantEmail: merchants.email,
      })
      .from(withdrawals)
      .leftJoin(merchants, eq(withdrawals.merchantId, merchants.id))
      .where(whereClause)
      .orderBy(desc(withdrawals.requestedAt))
      .limit(limit)
      .offset(offset);

    const [totalResult] = await db
      .select({ total: count() })
      .from(withdrawals)
      .where(whereClause);

    return NextResponse.json({
      success: true,
      data: {
        withdrawals: withdrawalList,
        pagination: {
          page,
          limit,
          total: totalResult.total,
          totalPages: Math.ceil(totalResult.total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching admin withdrawals:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Error interno" } },
      { status: 500 }
    );
  }
}
