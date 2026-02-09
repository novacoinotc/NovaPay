import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb, merchants, eq, sql } from "@novapay/db";
import { z } from "zod";

const balanceAdjustSchema = z.object({
  amount: z.number(),
  reason: z.string().min(1, "Se requiere un motivo"),
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
    const { amount, reason } = balanceAdjustSchema.parse(body);

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

    const currentBalance = parseFloat(merchant.balanceMxn);
    const newBalance = currentBalance + amount;

    if (newBalance < 0) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_AMOUNT", message: `Balance resultante sería negativo: $${newBalance.toFixed(2)}` } },
        { status: 400 }
      );
    }

    await db
      .update(merchants)
      .set({
        balanceMxn: sql`${merchants.balanceMxn} + ${amount.toFixed(2)}`,
        updatedAt: new Date(),
      })
      .where(eq(merchants.id, merchantId));

    console.log(`Admin balance adjustment: merchant=${merchantId} amount=${amount > 0 ? "+" : ""}${amount.toFixed(2)} reason="${reason}" by=${session.user.email}`);

    return NextResponse.json({
      success: true,
      data: {
        merchantId,
        previousBalance: currentBalance.toFixed(2),
        adjustment: amount.toFixed(2),
        newBalance: newBalance.toFixed(2),
        reason,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: error.errors[0].message } },
        { status: 400 }
      );
    }

    console.error("Error adjusting balance:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Error interno" } },
      { status: 500 }
    );
  }
}
