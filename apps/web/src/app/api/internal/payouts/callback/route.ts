import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, withdrawals, merchants } from "@novapay/db";
import { eq, sql } from "@novapay/db";
import { BUSINESS_RULES } from "@novapay/shared";

const payoutCallbackSchema = z.object({
  externalId: z.string().uuid(), // withdrawalId de NovaPay
  payoutId: z.string(),
  status: z.enum(["COMPLETED", "FAILED"]),
  claveRastreo: z.string().optional(),
  failureReason: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Verificar API key de NovaCore
    const apiKey = request.headers.get("x-api-key");
    const callbackSecret = process.env.NOVACORE_CALLBACK_SECRET || process.env.INTERNAL_API_KEY;

    if (!callbackSecret || apiKey !== callbackSecret) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Invalid API key" } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const data = payoutCallbackSchema.parse(body);

    const db = getDb();

    // Buscar el retiro por externalId (que es el withdrawalId)
    const [withdrawal] = await db
      .select()
      .from(withdrawals)
      .where(eq(withdrawals.id, data.externalId))
      .limit(1);

    if (!withdrawal) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Withdrawal not found" } },
        { status: 404 }
      );
    }

    // Si ya fue completado o fallido, ignorar duplicados
    if (withdrawal.status === "COMPLETED" || withdrawal.status === "FAILED") {
      return NextResponse.json({
        success: true,
        data: { message: "Already processed", status: withdrawal.status },
      });
    }

    if (data.status === "COMPLETED") {
      await db
        .update(withdrawals)
        .set({
          status: "COMPLETED",
          speiTrackingId: data.claveRastreo || withdrawal.speiTrackingId,
          processedAt: new Date(),
        })
        .where(eq(withdrawals.id, data.externalId));

      console.log(`Withdrawal ${data.externalId} completed. Clave rastreo: ${data.claveRastreo}`);
    } else if (data.status === "FAILED") {
      await db
        .update(withdrawals)
        .set({
          status: "FAILED",
          failureReason: data.failureReason || "Payout failed in NovaCore",
          processedAt: new Date(),
        })
        .where(eq(withdrawals.id, data.externalId));

      // Reembolsar el balance al comercio
      const refundAmount = parseFloat(withdrawal.amountMxn) + BUSINESS_RULES.WITHDRAWAL_FEE_MXN;
      await db
        .update(merchants)
        .set({
          balanceMxn: sql`${merchants.balanceMxn} + ${refundAmount.toFixed(2)}`,
          updatedAt: new Date(),
        })
        .where(eq(merchants.id, withdrawal.merchantId));

      console.error(`Withdrawal ${data.externalId} failed: ${data.failureReason}, refunded ${refundAmount} MXN`);
    }

    return NextResponse.json({
      success: true,
      data: {
        externalId: data.externalId,
        status: data.status,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: error.message } },
        { status: 400 }
      );
    }

    console.error("Error processing payout callback:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      { status: 500 }
    );
  }
}
