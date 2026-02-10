import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb, employees, eq, and } from "@novapay/db";
import { hash } from "bcryptjs";
import { z } from "zod";

const updateEmployeeSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  pin: z
    .string()
    .min(4, "PIN mínimo 4 dígitos")
    .max(6, "PIN máximo 6 dígitos")
    .regex(/^\d+$/, "El PIN debe ser solo números")
    .optional(),
  role: z.enum(["CASHIER", "MANAGER"]).optional(),
  isActive: z.boolean().optional(),
});

async function getSessionAndValidate() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "No autorizado" } },
      { status: 401 }
    )};
  }
  if (session.user.employeeId) {
    return { error: NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Solo el dueño puede gestionar empleados" } },
      { status: 403 }
    )};
  }
  return { session };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { session, error } = await getSessionAndValidate();
    if (error) return error;

    const db = getDb();
    const [employee] = await db
      .select({
        id: employees.id,
        name: employees.name,
        role: employees.role,
        isActive: employees.isActive,
        createdAt: employees.createdAt,
        updatedAt: employees.updatedAt,
      })
      .from(employees)
      .where(
        and(
          eq(employees.id, params.id),
          eq(employees.merchantId, session!.user.id)
        )
      )
      .limit(1);

    if (!employee) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Empleado no encontrado" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: employee });
  } catch (error) {
    console.error("Error fetching employee:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Error interno" } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { session, error } = await getSessionAndValidate();
    if (error) return error;

    const db = getDb();
    const body = await request.json();
    const updates = updateEmployeeSchema.parse(body);

    // Verify employee belongs to this merchant
    const [existing] = await db
      .select()
      .from(employees)
      .where(
        and(
          eq(employees.id, params.id),
          eq(employees.merchantId, session!.user.id)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Empleado no encontrado" } },
        { status: 404 }
      );
    }

    const setValues: Record<string, any> = { updatedAt: new Date() };
    if (updates.name !== undefined) setValues.name = updates.name;
    if (updates.role !== undefined) setValues.role = updates.role;
    if (updates.isActive !== undefined) setValues.isActive = updates.isActive;
    if (updates.pin !== undefined) setValues.pin = await hash(updates.pin, 10);

    const [updated] = await db
      .update(employees)
      .set(setValues)
      .where(eq(employees.id, params.id))
      .returning({
        id: employees.id,
        name: employees.name,
        role: employees.role,
        isActive: employees.isActive,
        createdAt: employees.createdAt,
        updatedAt: employees.updatedAt,
      });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: error.errors[0].message } },
        { status: 400 }
      );
    }

    console.error("Error updating employee:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Error interno" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { session, error } = await getSessionAndValidate();
    if (error) return error;

    const db = getDb();

    // Verify employee belongs to this merchant
    const [existing] = await db
      .select()
      .from(employees)
      .where(
        and(
          eq(employees.id, params.id),
          eq(employees.merchantId, session!.user.id)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Empleado no encontrado" } },
        { status: 404 }
      );
    }

    // Soft delete
    await db
      .update(employees)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(employees.id, params.id));

    return NextResponse.json({ success: true, data: { id: params.id, isActive: false } });
  } catch (error) {
    console.error("Error deleting employee:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Error interno" } },
      { status: 500 }
    );
  }
}
