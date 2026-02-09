import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, deposits } from "@novapay/db";
import { eq } from "@novapay/db";

// Schema de validación para depósito confirmado
const depositConfirmedSchema = z.object({
  depositId: z.string().uuid(),
  txHash: z.string(),
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
    const data = depositConfirmedSchema.parse(body);

    const db = getDb();

    // Buscar el depósito
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

    // Si ya está confirmado o más avanzado, no hacer nada
    if (deposit.status !== "PENDING") {
      return NextResponse.json({
        success: true,
        data: {
          message: `Deposit already ${deposit.status}`,
          status: deposit.status,
        },
      });
    }

    // Actualizar estado a CONFIRMED
    await db
      .update(deposits)
      .set({
        status: "CONFIRMED",
        confirmations: data.confirmations,
        confirmedAt: new Date(),
      })
      .where(eq(deposits.id, data.depositId));

    console.log(`Deposit ${data.depositId} confirmed with ${data.confirmations} confirmations`);

    return NextResponse.json({
      success: true,
      data: {
        depositId: data.depositId,
        status: "CONFIRMED",
        confirmations: data.confirmations,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: error.message },
        },
        { status: 400 }
      );
    }

    console.error("Error processing deposit confirmation:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
      },
      { status: 500 }
    );
  }
}
