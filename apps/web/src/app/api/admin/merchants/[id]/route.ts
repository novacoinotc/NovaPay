import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb, merchants, deposits, withdrawals, wallets, eq, desc } from "@novapay/db";
import { tron, ethereum } from "@novapay/crypto";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "No autorizado" } },
        { status: 403 }
      );
    }

    const db = getDb();
    const merchantId = params.id;

    const [merchant] = await db
      .select()
      .from(merchants)
      .where(eq(merchants.id, merchantId))
      .limit(1);

    if (!merchant) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Merchant no encontrado" } },
        { status: 404 }
      );
    }

    // Get wallets, recent deposits, recent withdrawals in parallel
    const [merchantWallets, recentDeposits, recentWithdrawals] = await Promise.all([
      db.select().from(wallets).where(eq(wallets.merchantId, merchantId)),
      db
        .select()
        .from(deposits)
        .where(eq(deposits.merchantId, merchantId))
        .orderBy(desc(deposits.detectedAt))
        .limit(10),
      db
        .select()
        .from(withdrawals)
        .where(eq(withdrawals.merchantId, merchantId))
        .orderBy(desc(withdrawals.requestedAt))
        .limit(10),
    ]);

    // Fetch on-chain balances for wallets (sequentially to avoid rate limits)
    const tronClient = process.env.TRON_FULL_HOST
      ? tron.createTronClient({
          fullHost: process.env.TRON_FULL_HOST,
          apiKey: process.env.TRONGRID_API_KEY,
        })
      : null;
    const ethProvider = process.env.ETHEREUM_RPC_URL
      ? ethereum.createEthereumProvider({ rpcUrl: process.env.ETHEREUM_RPC_URL })
      : null;

    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const walletsWithBalances = [];
    for (const wallet of merchantWallets) {
      let balance = "0";
      try {
        if (wallet.network === "TRON" && tronClient) {
          balance = await tron.getUsdtBalance(tronClient, wallet.address);
          await delay(350);
        } else if (wallet.network === "ETHEREUM" && ethProvider) {
          balance = await ethereum.getUsdtBalance(ethProvider, wallet.address);
        }
      } catch (error) {
        console.error(`Error fetching balance for ${wallet.address}:`, error);
      }
      walletsWithBalances.push({ ...wallet, balance });
    }

    return NextResponse.json({
      success: true,
      data: {
        merchant: {
          id: merchant.id,
          businessName: merchant.businessName,
          email: merchant.email,
          rfc: merchant.rfc,
          phone: merchant.phone,
          clabe: merchant.clabe,
          spreadPercent: merchant.spreadPercent,
          autoSpeiEnabled: merchant.autoSpeiEnabled,
          balanceMxn: merchant.balanceMxn,
          status: merchant.status,
          role: merchant.role,
          createdAt: merchant.createdAt,
        },
        wallets: walletsWithBalances,
        recentDeposits,
        recentWithdrawals,
      },
    });
  } catch (error) {
    console.error("Error fetching merchant detail:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Error interno" } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "No autorizado" } },
        { status: 403 }
      );
    }

    const db = getDb();
    const merchantId = params.id;
    const body = await request.json();

    const allowedUpdates: Record<string, any> = {};
    if (body.status && ["ACTIVE", "SUSPENDED", "BLOCKED", "PENDING"].includes(body.status)) {
      allowedUpdates.status = body.status;
    }

    if (Object.keys(allowedUpdates).length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "No valid fields to update" } },
        { status: 400 }
      );
    }

    allowedUpdates.updatedAt = new Date();

    const [updated] = await db
      .update(merchants)
      .set(allowedUpdates)
      .where(eq(merchants.id, merchantId))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Merchant no encontrado" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { merchant: updated },
    });
  } catch (error) {
    console.error("Error updating merchant:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Error interno" } },
      { status: 500 }
    );
  }
}
