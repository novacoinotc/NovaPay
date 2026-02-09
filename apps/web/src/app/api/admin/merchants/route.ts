import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb, merchants, deposits, withdrawals, wallets, eq, sql, count, and } from "@novapay/db";

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
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const offset = (page - 1) * limit;

    const db = getDb();

    // Build conditions
    const conditions = [];
    if (status) {
      conditions.push(eq(merchants.status, status as any));
    }
    if (search) {
      conditions.push(
        sql`(${merchants.businessName} ILIKE ${"%" + search + "%"} OR ${merchants.email} ILIKE ${"%" + search + "%"})`
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get merchants with counts
    const merchantList = await db
      .select({
        id: merchants.id,
        businessName: merchants.businessName,
        email: merchants.email,
        rfc: merchants.rfc,
        balanceMxn: merchants.balanceMxn,
        status: merchants.status,
        role: merchants.role,
        createdAt: merchants.createdAt,
      })
      .from(merchants)
      .where(whereClause)
      .orderBy(sql`${merchants.createdAt} DESC`)
      .limit(limit)
      .offset(offset);

    // Get total count
    const [totalResult] = await db
      .select({ total: count() })
      .from(merchants)
      .where(whereClause);

    // Get deposit/withdrawal counts per merchant
    const merchantsWithCounts = await Promise.all(
      merchantList.map(async (merchant) => {
        const [depositCount] = await db
          .select({ total: count() })
          .from(deposits)
          .where(eq(deposits.merchantId, merchant.id));

        const [withdrawalCount] = await db
          .select({ total: count() })
          .from(withdrawals)
          .where(eq(withdrawals.merchantId, merchant.id));

        return {
          ...merchant,
          depositCount: depositCount.total,
          withdrawalCount: withdrawalCount.total,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        merchants: merchantsWithCounts,
        pagination: {
          page,
          limit,
          total: totalResult.total,
          totalPages: Math.ceil(totalResult.total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching admin merchants:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Error interno" } },
      { status: 500 }
    );
  }
}
