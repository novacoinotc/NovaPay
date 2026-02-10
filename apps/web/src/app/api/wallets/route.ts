import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { WalletService } from "@/lib/services/wallet-service";

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

    return NextResponse.json({
      success: true,
      data: { wallets },
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
