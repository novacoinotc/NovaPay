import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, deposits, wallets } from "@novapay/db";
import { eq } from "@novapay/db";

const depositDetectedSchema = z.object({
  depositId: z.string().uuid().optional(),
  walletAddress: z.string(),
  txHash: z.string(),
  network: z.enum(["TRON", "ETHEREUM", "BITCOIN"]),
  asset: z.enum(["USDT_TRC20", "USDT_ERC20", "ETH", "BTC"]),
  amount: z.string(),
  confirmations: z.number(),
});

export async function POST(request: NextRequest) {
  try {
    // Verificar API key interno
    const apiKey = request.headers.get("x-internal-api-key");
    if (apiKey !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Invalid API key" } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const data = depositDetectedSchema.parse(body);

    const db = getDb();

    // Buscar wallet por dirección
    const [wallet] = await db
      .select()
      .from(wallets)
      .where(eq(wallets.address, data.walletAddress))
      .limit(1);

    if (!wallet) {
      return NextResponse.json(
        { success: false, error: { code: "WALLET_NOT_FOUND", message: "Wallet not found" } },
        { status: 404 }
      );
    }

    // Verificar si el txHash ya existe
    const [existing] = await db
      .select()
      .from(deposits)
      .where(eq(deposits.txHash, data.txHash))
      .limit(1);

    if (existing) {
      // Ya existe, actualizar confirmaciones si es necesario
      if (data.confirmations > existing.confirmations) {
        await db
          .update(deposits)
          .set({ confirmations: data.confirmations })
          .where(eq(deposits.id, existing.id));
      }

      return NextResponse.json({
        success: true,
        data: { depositId: existing.id, action: "updated" },
      });
    }

    // Crear nuevo registro de depósito
    const [deposit] = await db
      .insert(deposits)
      .values({
        merchantId: wallet.merchantId,
        walletId: wallet.id,
        txHash: data.txHash,
        network: data.network,
        asset: data.asset,
        amountCrypto: data.amount,
        confirmations: data.confirmations,
        status: "PENDING",
      })
      .returning();

    console.log(`New deposit detected: ${deposit.id} - ${data.amount} ${data.asset}`);

    return NextResponse.json({
      success: true,
      data: { depositId: deposit.id, action: "created" },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: error.message } },
        { status: 400 }
      );
    }

    console.error("Error processing deposit detection:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      { status: 500 }
    );
  }
}
