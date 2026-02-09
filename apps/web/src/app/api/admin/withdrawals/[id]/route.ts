import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb, withdrawals, merchants, eq, sql } from "@novapay/db";
import { z } from "zod";
import { BUSINESS_RULES } from "@novapay/shared";
import { SpeiService } from "@/lib/services/spei-service";

const actionSchema = z.object({
  action: z.enum(["retry", "fail", "complete"]),
  reason: z.string().optional(),
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
    const withdrawalId = params.id;
    const body = await request.json();
    const { action, reason } = actionSchema.parse(body);

    const [withdrawal] = await db
      .select()
      .from(withdrawals)
      .where(eq(withdrawals.id, withdrawalId))
      .limit(1);

    if (!withdrawal) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Retiro no encontrado" } },
        { status: 404 }
      );
    }

    if (action === "retry") {
      // Reset to PENDING and re-process
      await db
        .update(withdrawals)
        .set({ status: "PENDING", failureReason: null })
        .where(eq(withdrawals.id, withdrawalId));

      // Process the withdrawal (sends to NovaCore)
      const result = await SpeiService.processWithdrawal(withdrawalId);

      return NextResponse.json({
        success: true,
        data: {
          action: "retry",
          withdrawalId,
          result,
        },
      });
    }

    if (action === "fail") {
      // Mark as FAILED and refund balance
      if (withdrawal.status === "COMPLETED") {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_ACTION", message: "No se puede rechazar un retiro completado" } },
          { status: 400 }
        );
      }

      await db
        .update(withdrawals)
        .set({
          status: "FAILED",
          failureReason: reason || "Rechazado por administrador",
          processedAt: new Date(),
        })
        .where(eq(withdrawals.id, withdrawalId));

      // Refund balance to merchant
      const refundAmount = parseFloat(withdrawal.amountMxn) + BUSINESS_RULES.WITHDRAWAL_FEE_MXN;
      await db
        .update(merchants)
        .set({
          balanceMxn: sql`${merchants.balanceMxn} + ${refundAmount.toFixed(2)}`,
          updatedAt: new Date(),
        })
        .where(eq(merchants.id, withdrawal.merchantId));

      console.log(`Admin rejected withdrawal ${withdrawalId}, refunded ${refundAmount} MXN to merchant ${withdrawal.merchantId}`);

      return NextResponse.json({
        success: true,
        data: {
          action: "fail",
          withdrawalId,
          refundedAmount: refundAmount,
        },
      });
    }

    if (action === "complete") {
      // Manually mark as completed
      await db
        .update(withdrawals)
        .set({
          status: "COMPLETED",
          processedAt: new Date(),
        })
        .where(eq(withdrawals.id, withdrawalId));

      console.log(`Admin manually completed withdrawal ${withdrawalId}`);

      return NextResponse.json({
        success: true,
        data: { action: "complete", withdrawalId },
      });
    }

    return NextResponse.json(
      { success: false, error: { code: "INVALID_ACTION", message: "Acción no válida" } },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: error.message } },
        { status: 400 }
      );
    }

    console.error("Error processing admin withdrawal action:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Error interno" } },
      { status: 500 }
    );
  }
}
