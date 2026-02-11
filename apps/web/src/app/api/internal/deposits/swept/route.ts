import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, deposits, hotWalletTransactions } from "@novapay/db";
import { eq } from "@novapay/db";

const depositSweptSchema = z.object({
  depositId: z.string().uuid(),
  sweepTxHash: z.string(),
  amountSwept: z.string(),
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
    const data = depositSweptSchema.parse(body);

    const db = getDb();

    // Obtener depósito
    const [deposit] = await db
      .select()
      .from(deposits)
      .where(eq(deposits.id, data.depositId))
      .limit(1);

    if (!deposit) {
      return NextResponse.json(
        { success: false, error: { code: "DEPOSIT_NOT_FOUND", message: "Deposit not found" } },
        { status: 404 }
      );
    }

    // Si ya fue swept, no reprocesar
    if (deposit.sweepTxHash) {
      return NextResponse.json({
        success: true,
        data: { message: "Deposit already swept" },
      });
    }

    // Registrar sweep (solo info de barrido, NO acreditar MXN ni disparar SPEI)
    // La acreditación MXN + auto-SPEI se hace exclusivamente en deposit-confirmed
    await db
      .update(deposits)
      .set({
        sweepTxHash: data.sweepTxHash,
        sweptAt: new Date(),
      })
      .where(eq(deposits.id, data.depositId));

    // Registrar transacción de hot wallet
    await db.insert(hotWalletTransactions).values({
      depositId: deposit.id,
      network: deposit.network,
      asset: deposit.asset,
      txHash: data.sweepTxHash,
      direction: "IN",
      amount: data.amountSwept,
    });

    console.log(`Deposit ${deposit.id} swept (txHash: ${data.sweepTxHash})`);

    return NextResponse.json({
      success: true,
      data: {
        depositId: deposit.id,
        swept: true,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: error.message } },
        { status: 400 }
      );
    }

    console.error("Error processing deposit swept:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      { status: 500 }
    );
  }
}
