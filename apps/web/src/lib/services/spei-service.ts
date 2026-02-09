import { getDb, withdrawals, merchants } from "@novapay/db";
import { eq, sql } from "@novapay/db";
import { generateSpeiReference, BUSINESS_RULES } from "@novapay/shared";

// Configuración del proveedor SPEI (OPM, Finco, etc.)
const SPEI_CONFIG = {
  apiUrl: process.env.SPEI_API_URL || "",
  apiKey: process.env.SPEI_API_KEY || "",
  merchantId: process.env.SPEI_MERCHANT_ID || "",
};

interface SpeiTransferRequest {
  amount: number;
  clabe: string;
  beneficiaryName: string;
  concept: string;
  reference: string;
}

interface SpeiTransferResponse {
  success: boolean;
  trackingId?: string;
  error?: string;
}

export class SpeiService {
  /**
   * Envía una transferencia SPEI
   */
  static async sendTransfer(
    request: SpeiTransferRequest
  ): Promise<SpeiTransferResponse> {
    // Si no hay configuración SPEI, simular respuesta
    if (!SPEI_CONFIG.apiUrl || !SPEI_CONFIG.apiKey) {
      console.log("SPEI not configured, simulating transfer:", request);
      return {
        success: true,
        trackingId: `SIM-${Date.now()}`,
      };
    }

    try {
      // TODO: Implementar llamada real al proveedor SPEI
      // Esto dependerá del proveedor específico (OPM, Finco, etc.)

      const response = await fetch(`${SPEI_CONFIG.apiUrl}/transfers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SPEI_CONFIG.apiKey}`,
        },
        body: JSON.stringify({
          merchant_id: SPEI_CONFIG.merchantId,
          amount: request.amount,
          clabe_destino: request.clabe,
          beneficiary_name: request.beneficiaryName,
          concept: request.concept,
          reference: request.reference,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || "Error en la transferencia SPEI",
        };
      }

      return {
        success: true,
        trackingId: data.tracking_id || data.id,
      };
    } catch (error: any) {
      console.error("SPEI transfer error:", error);
      return {
        success: false,
        error: error.message || "Error de conexión con SPEI",
      };
    }
  }

  /**
   * Procesa un retiro pendiente enviando SPEI
   */
  static async processWithdrawal(withdrawalId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    const db = getDb();

    // Obtener retiro
    const [withdrawal] = await db
      .select()
      .from(withdrawals)
      .where(eq(withdrawals.id, withdrawalId))
      .limit(1);

    if (!withdrawal) {
      return { success: false, error: "Retiro no encontrado" };
    }

    if (withdrawal.status !== "PENDING") {
      return { success: false, error: "Retiro ya procesado" };
    }

    // Obtener comercio para el nombre
    const [merchant] = await db
      .select()
      .from(merchants)
      .where(eq(merchants.id, withdrawal.merchantId))
      .limit(1);

    if (!merchant) {
      return { success: false, error: "Comercio no encontrado" };
    }

    // Marcar como en proceso
    await db
      .update(withdrawals)
      .set({ status: "PROCESSING" })
      .where(eq(withdrawals.id, withdrawalId));

    // Generar referencia
    const reference = generateSpeiReference();

    // Enviar SPEI
    const result = await this.sendTransfer({
      amount: parseFloat(withdrawal.netAmountMxn),
      clabe: withdrawal.clabe,
      beneficiaryName: merchant.businessName,
      concept: `NovaPay - Retiro ${withdrawalId.slice(0, 8)}`,
      reference,
    });

    if (result.success) {
      await db
        .update(withdrawals)
        .set({
          status: "COMPLETED",
          speiReference: reference,
          speiTrackingId: result.trackingId,
          processedAt: new Date(),
        })
        .where(eq(withdrawals.id, withdrawalId));

      console.log(`Withdrawal ${withdrawalId} completed with tracking ${result.trackingId}`);
      return { success: true };
    } else {
      await db
        .update(withdrawals)
        .set({
          status: "FAILED",
          failureReason: result.error,
        })
        .where(eq(withdrawals.id, withdrawalId));

      // Reembolsar el balance al comercio en caso de fallo
      const refundAmount = parseFloat(withdrawal.amountMxn) + BUSINESS_RULES.WITHDRAWAL_FEE_MXN;
      await db
        .update(merchants)
        .set({
          balanceMxn: sql`${merchants.balanceMxn} + ${refundAmount.toFixed(2)}`,
          updatedAt: new Date(),
        })
        .where(eq(merchants.id, withdrawal.merchantId));

      console.log(`Refunded ${refundAmount.toFixed(2)} MXN to merchant ${withdrawal.merchantId} after failed withdrawal`);

      return { success: false, error: result.error };
    }
  }

  /**
   * Procesa todos los retiros pendientes
   */
  static async processPendingWithdrawals(): Promise<void> {
    const db = getDb();

    const pendingWithdrawals = await db
      .select()
      .from(withdrawals)
      .where(eq(withdrawals.status, "PENDING"));

    console.log(`Processing ${pendingWithdrawals.length} pending withdrawals...`);

    for (const withdrawal of pendingWithdrawals) {
      await this.processWithdrawal(withdrawal.id);
    }
  }
}
