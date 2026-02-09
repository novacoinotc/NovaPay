import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb, withdrawals } from "@novapay/db";
import { eq, desc, sql } from "@novapay/db";
import { z } from "zod";
import { CreditService } from "@/lib/services/credit-service";
import { BUSINESS_RULES } from "@novapay/shared";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "No autorizado" } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

    const db = getDb();

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(withdrawals)
      .where(eq(withdrawals.merchantId, session.user.id));

    // Get withdrawals with pagination
    const merchantWithdrawals = await db
      .select({
        id: withdrawals.id,
        amountMxn: withdrawals.amountMxn,
        feeMxn: withdrawals.feeMxn,
        netAmountMxn: withdrawals.netAmountMxn,
        clabe: withdrawals.clabe,
        speiReference: withdrawals.speiReference,
        speiTrackingId: withdrawals.speiTrackingId,
        status: withdrawals.status,
        failureReason: withdrawals.failureReason,
        requestedAt: withdrawals.requestedAt,
        processedAt: withdrawals.processedAt,
      })
      .from(withdrawals)
      .where(eq(withdrawals.merchantId, session.user.id))
      .orderBy(desc(withdrawals.requestedAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return NextResponse.json({
      success: true,
      data: {
        items: merchantWithdrawals,
        total: Number(count),
        page,
        pageSize,
        hasMore: page * pageSize < Number(count),
      },
    });
  } catch (error) {
    console.error("Error fetching withdrawals:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Error interno" } },
      { status: 500 }
    );
  }
}

const withdrawalSchema = z.object({
  amountMxn: z
    .number()
    .min(BUSINESS_RULES.MIN_WITHDRAWAL_MXN, `Monto mínimo: $${BUSINESS_RULES.MIN_WITHDRAWAL_MXN}`)
    .max(BUSINESS_RULES.MAX_WITHDRAWAL_MXN, `Monto máximo: $${BUSINESS_RULES.MAX_WITHDRAWAL_MXN}`),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "No autorizado" } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { amountMxn } = withdrawalSchema.parse(body);

    const result = await CreditService.processWithdrawal(session.user.id, amountMxn);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: "WITHDRAWAL_FAILED", message: result.error } },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { withdrawalId: result.withdrawalId },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: error.errors[0].message } },
        { status: 400 }
      );
    }

    console.error("Error creating withdrawal:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Error interno" } },
      { status: 500 }
    );
  }
}
