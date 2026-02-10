import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb, wallets, deposits, hotWalletTransactions, eq, and } from "@novapay/db";
import { tron, ethereum, deriveTronWalletWithKey, deriveEthWalletWithKey } from "@novapay/crypto";
import { z } from "zod";

const sweepSchema = z.object({
  walletId: z.string().uuid("walletId debe ser un UUID válido"),
});

export async function POST(
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
    const { walletId } = sweepSchema.parse(body);

    // Look up wallet and verify it belongs to this merchant
    const [wallet] = await db
      .select()
      .from(wallets)
      .where(and(eq(wallets.id, walletId), eq(wallets.merchantId, merchantId)))
      .limit(1);

    if (!wallet) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Wallet no encontrada o no pertenece a este merchant" } },
        { status: 404 }
      );
    }

    if (wallet.walletIndex === null || wallet.walletIndex === undefined) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_WALLET", message: "Wallet no tiene walletIndex asignado" } },
        { status: 400 }
      );
    }

    // Get on-chain USDT balance
    let balance: string;

    if (wallet.network === "TRON") {
      const tronClient = tron.createTronClient({
        fullHost: process.env.TRON_FULL_HOST!,
        apiKey: process.env.TRONGRID_API_KEY,
      });
      balance = await tron.getUsdtBalance(tronClient, wallet.address);
    } else if (wallet.network === "ETHEREUM") {
      const provider = ethereum.createEthereumProvider({
        rpcUrl: process.env.ETHEREUM_RPC_URL!,
      });
      balance = await ethereum.getUsdtBalance(provider, wallet.address);
    } else {
      return NextResponse.json(
        { success: false, error: { code: "UNSUPPORTED_NETWORK", message: `Red no soportada para sweep: ${wallet.network}` } },
        { status: 400 }
      );
    }

    if (parseFloat(balance) <= 0) {
      return NextResponse.json(
        { success: false, error: { code: "ZERO_BALANCE", message: `Balance on-chain es 0 para ${wallet.address}` } },
        { status: 400 }
      );
    }

    // Derive private key and execute sweep
    let sweepResult: { success: boolean; txHash?: string; error?: string };

    if (wallet.network === "TRON") {
      const derivedWallet = deriveTronWalletWithKey(process.env.HD_WALLET_MNEMONIC!, wallet.walletIndex);
      const tronClient = tron.createTronClient({
        fullHost: process.env.TRON_FULL_HOST!,
        apiKey: process.env.TRONGRID_API_KEY,
      });
      sweepResult = await tron.sweepWithMasterEnergy(
        tronClient,
        process.env.HOT_WALLET_PRIVATE_KEY!,
        derivedWallet.privateKey,
        process.env.HOT_WALLET_ADDRESS!,
        balance
      );
    } else {
      // ETHEREUM
      const derivedWallet = deriveEthWalletWithKey(process.env.HD_WALLET_MNEMONIC!, wallet.walletIndex);
      const provider = ethereum.createEthereumProvider({
        rpcUrl: process.env.ETHEREUM_RPC_URL!,
      });
      sweepResult = await ethereum.sweepUsdt(
        provider,
        derivedWallet.privateKey,
        process.env.HOT_WALLET_ETHEREUM!,
        balance
      );
    }

    if (!sweepResult.success || !sweepResult.txHash) {
      return NextResponse.json(
        { success: false, error: { code: "SWEEP_FAILED", message: sweepResult.error || "Sweep falló sin mensaje de error" } },
        { status: 500 }
      );
    }

    // Insert into hotWalletTransactions
    await db.insert(hotWalletTransactions).values({
      network: wallet.network,
      asset: wallet.asset,
      txHash: sweepResult.txHash,
      direction: "IN",
      amount: balance,
    });

    // Update CREDITED deposits for this wallet to SWEPT
    await db
      .update(deposits)
      .set({
        status: "SWEPT",
        sweepTxHash: sweepResult.txHash,
        sweptAt: new Date(),
      })
      .where(
        and(
          eq(deposits.walletId, walletId),
          eq(deposits.status, "CREDITED")
        )
      );

    console.log(`Manual sweep: merchant=${merchantId} wallet=${walletId} network=${wallet.network} amount=${balance} txHash=${sweepResult.txHash} by=${session.user.email}`);

    return NextResponse.json({
      success: true,
      data: {
        txHash: sweepResult.txHash,
        amountSwept: balance,
        network: wallet.network,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: error.errors[0].message } },
        { status: 400 }
      );
    }

    console.error("Error in manual sweep:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Error interno" } },
      { status: 500 }
    );
  }
}
