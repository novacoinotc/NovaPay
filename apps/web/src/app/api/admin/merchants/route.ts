import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb, merchants, deposits, withdrawals, wallets, eq, sql, count, and } from "@novapay/db";
import { tron, ethereum } from "@novapay/crypto";

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

    // Initialize blockchain clients once for all balance queries
    const tronClient =
      process.env.TRON_FULL_HOST
        ? tron.createTronClient({
            fullHost: process.env.TRON_FULL_HOST,
            apiKey: process.env.TRONGRID_API_KEY,
          })
        : null;
    const ethProvider =
      process.env.ETHEREUM_RPC_URL
        ? ethereum.createEthereumProvider({ rpcUrl: process.env.ETHEREUM_RPC_URL })
        : null;

    // Get deposit/withdrawal counts + wallet USDT balances per merchant
    const merchantsWithCounts = await Promise.all(
      merchantList.map(async (merchant) => {
        const [[depositCount], [withdrawalCount], merchantWallets] = await Promise.all([
          db.select({ total: count() }).from(deposits).where(eq(deposits.merchantId, merchant.id)),
          db.select({ total: count() }).from(withdrawals).where(eq(withdrawals.merchantId, merchant.id)),
          db.select().from(wallets).where(eq(wallets.merchantId, merchant.id)),
        ]);

        // Fetch on-chain USDT balance for each wallet
        let walletUsdtBalance = 0;
        for (const wallet of merchantWallets) {
          try {
            if (wallet.network === "TRON" && tronClient) {
              const bal = await tron.getUsdtBalance(tronClient, wallet.address);
              walletUsdtBalance += parseFloat(bal);
            } else if (wallet.network === "ETHEREUM" && ethProvider) {
              const bal = await ethereum.getUsdtBalance(ethProvider, wallet.address);
              walletUsdtBalance += parseFloat(bal);
            }
          } catch (error) {
            console.error(`Error fetching balance for ${wallet.address}:`, error);
          }
        }

        return {
          ...merchant,
          depositCount: depositCount.total,
          withdrawalCount: withdrawalCount.total,
          walletUsdtBalance: walletUsdtBalance.toFixed(2),
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
