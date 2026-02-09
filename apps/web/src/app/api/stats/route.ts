import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { CreditService } from "@/lib/services/credit-service";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "No autorizado" } },
        { status: 401 }
      );
    }

    const stats = await CreditService.getMerchantStats(session.user.id);

    return NextResponse.json({
      success: true,
      data: { stats },
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Error interno" } },
      { status: 500 }
    );
  }
}
