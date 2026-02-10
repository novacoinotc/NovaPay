import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb, employees, eq, and } from "@novapay/db";
import { hash } from "bcryptjs";
import { z } from "zod";

const createEmployeeSchema = z.object({
  name: z.string().min(1, "Nombre requerido").max(200),
  pin: z
    .string()
    .min(4, "PIN mínimo 4 dígitos")
    .max(6, "PIN máximo 6 dígitos")
    .regex(/^\d+$/, "El PIN debe ser solo números"),
  role: z.enum(["CASHIER", "MANAGER"]).default("CASHIER"),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "No autorizado" } },
        { status: 401 }
      );
    }

    // Solo el dueño puede ver empleados (no un empleado)
    if (session.user.employeeId) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Solo el dueño puede gestionar empleados" } },
        { status: 403 }
      );
    }

    const db = getDb();
    const result = await db
      .select({
        id: employees.id,
        name: employees.name,
        role: employees.role,
        isActive: employees.isActive,
        createdAt: employees.createdAt,
        updatedAt: employees.updatedAt,
      })
      .from(employees)
      .where(eq(employees.merchantId, session.user.id))
      .orderBy(employees.createdAt);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching employees:", error);
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

    if (session.user.employeeId) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Solo el dueño puede gestionar empleados" } },
        { status: 403 }
      );
    }

    const db = getDb();
    const body = await request.json();
    const { name, pin, role } = createEmployeeSchema.parse(body);

    const hashedPin = await hash(pin, 10);

    const [employee] = await db
      .insert(employees)
      .values({
        merchantId: session.user.id,
        name,
        pin: hashedPin,
        role,
      })
      .returning({
        id: employees.id,
        name: employees.name,
        role: employees.role,
        isActive: employees.isActive,
        createdAt: employees.createdAt,
      });

    console.log(`Employee created: ${employee.id} (${name}) for merchant ${session.user.id}`);

    return NextResponse.json({ success: true, data: employee }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: error.errors[0].message } },
        { status: 400 }
      );
    }

    console.error("Error creating employee:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Error interno" } },
      { status: 500 }
    );
  }
}
