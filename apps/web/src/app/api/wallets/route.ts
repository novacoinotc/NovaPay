import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { WalletService } from "@/lib/services/wallet-service";
import { tron, ethereum, priceCache } from "@novapay/crypto";
import { CryptoAsset } from "@novapay/shared";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "No autorizado" } },
        { status: 401 }
      );
    }

    const wallets = await WalletService.getWalletsByMerchant(session.user.id);

    // Obtener balances en paralelo
    const walletsWithBalances = await Promise.all(
      wallets.map(async (wallet) => {
        let balance = "0";

        try {
          if (wallet.network === "TRON" && process.env.TRON_FULL_HOST) {
            const tronClient = tron.createTronClient({
              fullHost: process.env.TRON_FULL_HOST,
              apiKey: process.env.TRONGRID_API_KEY,
            });
            balance = await tron.getUsdtBalance(tronClient, wallet.address);
          } else if (wallet.network === "ETHEREUM" && process.env.ETHEREUM_RPC_URL) {
            const provider = ethereum.createEthereumProvider({
              rpcUrl: process.env.ETHEREUM_RPC_URL,
            });
            balance = await ethereum.getUsdtBalance(provider, wallet.address);
          }
        } catch (error) {
          console.error(`Error fetching balance for ${wallet.address}:`, error);
        }

        return {
          ...wallet,
          balance,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: { wallets: walletsWithBalances },
    });
  } catch (error) {
    console.error("Error fetching wallets:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Error interno" } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "No autorizado" } },
        { status: 401 }
      );
    }

    // Generar wallets para el comercio
    await WalletService.generateWalletsForMerchant(session.user.id);

    // Obtener las wallets generadas
    const wallets = await WalletService.getWalletsByMerchant(session.user.id);

    return NextResponse.json({
      success: true,
      data: { wallets },
    });
  } catch (error) {
    console.error("Error generating wallets:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Error al generar wallets" } },
      { status: 500 }
    );
  }
}
