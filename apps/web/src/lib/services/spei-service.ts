import { getDb, withdrawals, merchants } from "@novapay/db";
import { eq, sql } from "@novapay/db";
import { generateSpeiReference, BUSINESS_RULES } from "@novapay/shared";

// NovaCore configuration
const NOVACORE_API_URL = process.env.NOVACORE_API_URL || "";
const NOVACORE_API_KEY = process.env.NOVACORE_API_KEY || "";

interface NovaCorePayoutResponse {
  success: boolean;
  payoutId?: string;
  status?: string;
  trackingKey?: string;
  error?: string;
}

export class SpeiService {
  /**
   * Envía instrucción de pago a NovaCore
   */
  static async sendToNovaCore(
    externalId: string,
    amount: number,
    clabe: string,
    beneficiaryName: string,
    concept: string,
    reference: string
  ): Promise<NovaCorePayoutResponse> {
    if (!NOVACORE_API_URL || !NOVACORE_API_KEY) {
      console.warn("NovaCore not configured, simulating payout");
      return {
        success: true,
        payoutId: `SIM-${Date.now()}`,
        status: "QUEUED",
      };
    }

    try {
      const response = await fetch(`${NOVACORE_API_URL}/api/v1/payouts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${NOVACORE_API_KEY}`,
        },
        body: JSON.stringify({
          externalId,
          amount,
          clabe,
          beneficiaryName,
          concept,
          reference,
        }),
      });

      const text = await response.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        return {
          success: false,
          error: `NovaCore HTTP ${response.status}: ${text.slice(0, 200)}`,
        };
      }

      if (!response.ok) {
        return {
          success: false,
          error: data.error?.message || data.message || `HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        payoutId: data.payoutId,
        status: data.status,
        trackingKey: data.trackingKey,
      };
    } catch (error: any) {
      console.error("NovaCore payout error:", error);
      return {
        success: false,
        error: error.message || "Error de conexión con NovaCore",
      };
    }
  }

  /**
   * Procesa un retiro enviando instrucción a NovaCore
   */
  static async processWithdrawal(withdrawalId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    const db = getDb();

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

    const reference = generateSpeiReference();

    // Enviar instrucción a NovaCore
    const result = await this.sendToNovaCore(
      withdrawalId, // externalId = withdrawalId de NovaPay
      parseFloat(withdrawal.netAmountMxn),
      withdrawal.clabe,
      merchant.businessName,
      `NovaPay - Pago ${withdrawalId.slice(0, 8)}`,
      reference
    );

    if (result.success) {
      await db
        .update(withdrawals)
        .set({
          status: "PROCESSING",
          speiReference: reference,
          speiTrackingId: result.payoutId,
        })
        .where(eq(withdrawals.id, withdrawalId));

      console.log(`Withdrawal ${withdrawalId} sent to NovaCore: ${result.payoutId}`);
      return { success: true };
    } else {
      await db
        .update(withdrawals)
        .set({
          status: "FAILED",
          failureReason: result.error,
        })
        .where(eq(withdrawals.id, withdrawalId));

      // Reembolsar el balance al comercio
      const refundAmount = parseFloat(withdrawal.amountMxn) + BUSINESS_RULES.WITHDRAWAL_FEE_MXN;
      await db
        .update(merchants)
        .set({
          balanceMxn: sql`${merchants.balanceMxn} + ${refundAmount.toFixed(2)}`,
          updatedAt: new Date(),
        })
        .where(eq(merchants.id, withdrawal.merchantId));

      console.error(`Withdrawal ${withdrawalId} failed: ${result.error}, refunded ${refundAmount} MXN`);
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

    if (pendingWithdrawals.length === 0) return;

    console.log(`Processing ${pendingWithdrawals.length} pending withdrawals...`);

    for (const withdrawal of pendingWithdrawals) {
      await this.processWithdrawal(withdrawal.id);
    }
  }
}
