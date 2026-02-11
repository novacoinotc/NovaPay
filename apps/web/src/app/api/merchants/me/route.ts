import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb, merchants } from "@novapay/db";
import { eq } from "@novapay/db";
import { z } from "zod";
import { isValidClabe } from "@novapay/shared";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "No autorizado" } },
        { status: 401 }
      );
    }

    const db = getDb();
    const [merchant] = await db
      .select({
        id: merchants.id,
        email: merchants.email,
        businessName: merchants.businessName,
        rfc: merchants.rfc,
        phone: merchants.phone,
        clabe: merchants.clabe,
        spreadPercent: merchants.spreadPercent,
        autoSpeiEnabled: merchants.autoSpeiEnabled,
        balanceMxn: merchants.balanceMxn,
        status: merchants.status,
        createdAt: merchants.createdAt,
      })
      .from(merchants)
      .where(eq(merchants.id, session.user.id))
      .limit(1);

    if (!merchant) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Comercio no encontrado" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { merchant },
    });
  } catch (error) {
    console.error("Error fetching merchant:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Error interno" } },
      { status: 500 }
    );
  }
}

const updateSchema = z.object({
  phone: z.string().min(10).max(15).optional(),
  clabe: z.string().length(18, "CLABE debe tener 18 dígitos").optional(),
  autoSpeiEnabled: z.boolean().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "No autorizado" } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const data = updateSchema.parse(body);

    const db = getDb();

    const [updated] = await db
      .update(merchants)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(merchants.id, session.user.id))
      .returning({
        id: merchants.id,
        email: merchants.email,
        businessName: merchants.businessName,
        phone: merchants.phone,
        clabe: merchants.clabe,
        autoSpeiEnabled: merchants.autoSpeiEnabled,
      });

    return NextResponse.json({
      success: true,
      data: { merchant: updated },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: error.errors[0].message } },
        { status: 400 }
      );
    }

    console.error("Error updating merchant:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Error interno" } },
      { status: 500 }
    );
  }
}
