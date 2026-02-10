import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { getDb, merchants } from "@novapay/db";
import { eq } from "@novapay/db";
import { isValidClabe } from "@novapay/shared";

const registerSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  businessName: z.string().min(2, "Nombre del negocio muy corto").max(200),
  rfc: z.string().optional().default(""),
  phone: z.string().min(10, "Teléfono inválido").max(15),
  clabe: z.string().refine(isValidClabe, "CLABE inválida"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = registerSchema.parse(body);

    const db = getDb();

    // Verificar si el email ya existe
    const [existing] = await db
      .select()
      .from(merchants)
      .where(eq(merchants.email, data.email.toLowerCase()))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "EMAIL_EXISTS", message: "Este email ya está registrado" },
        },
        { status: 400 }
      );
    }

    // Hash de la contraseña
    const passwordHash = await hash(data.password, 12);

    // Crear comercio
    const [merchant] = await db
      .insert(merchants)
      .values({
        email: data.email.toLowerCase(),
        passwordHash,
        businessName: data.businessName,
        rfc: data.rfc.toUpperCase(),
        phone: data.phone,
        clabe: data.clabe,
        status: "ACTIVE",
      })
      .returning({
        id: merchants.id,
        email: merchants.email,
        businessName: merchants.businessName,
      });

    return NextResponse.json({
      success: true,
      data: { merchant },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: error.errors[0].message,
          },
        },
        { status: 400 }
      );
    }

    console.error("Registration error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Error interno del servidor" },
      },
      { status: 500 }
    );
  }
}
