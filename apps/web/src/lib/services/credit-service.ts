import { getDb, deposits, merchants, withdrawals } from "@novapay/db";
import { eq, sql } from "@novapay/db";
import { getQuote } from "@novapay/crypto";
import { calculateMxnAmount, CryptoAsset, BUSINESS_RULES } from "@novapay/shared";

export class CreditService {
  /**
   * Acredita un depósito al balance del comercio
   */
  static async creditDeposit(depositId: string): Promise<{
    success: boolean;
    amountMxn?: string;
    error?: string;
  }> {
    const db = getDb();

    // Obtener el depósito
    const [deposit] = await db
      .select()
      .from(deposits)
      .where(eq(deposits.id, depositId))
      .limit(1);

    if (!deposit) {
      return { success: false, error: "Depósito no encontrado" };
    }

    if (deposit.status === "CREDITED") {
      return { success: false, error: "Depósito ya acreditado" };
    }

    if (deposit.status !== "SWEPT") {
      return { success: false, error: "Depósito no ha sido swept aún" };
    }

    // Obtener el comercio para el spread
    const [merchant] = await db
      .select()
      .from(merchants)
      .where(eq(merchants.id, deposit.merchantId))
      .limit(1);

    if (!merchant) {
      return { success: false, error: "Comercio no encontrado" };
    }

    // Obtener precio actual
    const quote = await getQuote(deposit.asset as CryptoAsset);

    // Calcular MXN con spread
    const spreadPercent = parseFloat(merchant.spreadPercent);
    const { netMxn, grossMxn, spreadMxn } = calculateMxnAmount(
      deposit.amountCrypto,
      quote.priceMxn,
      spreadPercent
    );

    // Actualizar depósito y balance en una transacción
    // Nota: Drizzle no tiene transacciones nativas con Neon HTTP,
    // pero podemos hacer las operaciones secuencialmente

    // 1. Actualizar depósito
    await db
      .update(deposits)
      .set({
        status: "CREDITED",
        amountMxn: netMxn.toFixed(2),
        exchangeRate: quote.priceMxn.toFixed(6),
        spreadPercent: spreadPercent.toFixed(2),
        creditedAt: new Date(),
      })
      .where(eq(deposits.id, depositId));

    // 2. Incrementar balance del comercio
    await db
      .update(merchants)
      .set({
        balanceMxn: sql`${merchants.balanceMxn} + ${netMxn.toFixed(2)}`,
        updatedAt: new Date(),
      })
      .where(eq(merchants.id, merchant.id));

    console.log(`Credited ${netMxn.toFixed(2)} MXN to merchant ${merchant.id}`);

    return {
      success: true,
      amountMxn: netMxn.toFixed(2),
    };
  }

  /**
   * Procesa un retiro SPEI
   */
  static async processWithdrawal(
    merchantId: string,
    amountMxn: number
  ): Promise<{
    success: boolean;
    withdrawalId?: string;
    error?: string;
  }> {
    const db = getDb();

    // Validar monto
    if (amountMxn < BUSINESS_RULES.MIN_WITHDRAWAL_MXN) {
      return {
        success: false,
        error: `Monto mínimo de retiro: $${BUSINESS_RULES.MIN_WITHDRAWAL_MXN} MXN`,
      };
    }

    if (amountMxn > BUSINESS_RULES.MAX_WITHDRAWAL_MXN) {
      return {
        success: false,
        error: `Monto máximo de retiro: $${BUSINESS_RULES.MAX_WITHDRAWAL_MXN} MXN`,
      };
    }

    // Obtener comercio
    const [merchant] = await db
      .select()
      .from(merchants)
      .where(eq(merchants.id, merchantId))
      .limit(1);

    if (!merchant) {
      return { success: false, error: "Comercio no encontrado" };
    }

    const balance = parseFloat(merchant.balanceMxn);
    const fee = BUSINESS_RULES.WITHDRAWAL_FEE_MXN;
    const totalRequired = amountMxn + fee;

    if (balance < totalRequired) {
      return {
        success: false,
        error: `Saldo insuficiente. Disponible: $${balance.toFixed(2)} MXN, Requerido: $${totalRequired.toFixed(2)} MXN (incluye comisión de $${fee} MXN)`,
      };
    }

    // Crear retiro
    const [withdrawal] = await db
      .insert(withdrawals)
      .values({
        merchantId,
        amountMxn: amountMxn.toFixed(2),
        feeMxn: fee.toFixed(2),
        netAmountMxn: amountMxn.toFixed(2),
        clabe: merchant.clabe,
        status: "PENDING",
      })
      .returning();

    // Descontar del balance
    await db
      .update(merchants)
      .set({
        balanceMxn: sql`${merchants.balanceMxn} - ${totalRequired.toFixed(2)}`,
        updatedAt: new Date(),
      })
      .where(eq(merchants.id, merchantId));

    return {
      success: true,
      withdrawalId: withdrawal.id,
    };
  }

  /**
   * Obtiene el resumen de stats del comercio
   */
  static async getMerchantStats(merchantId: string) {
    const db = getDb();

    const [merchant] = await db
      .select({
        balanceMxn: merchants.balanceMxn,
      })
      .from(merchants)
      .where(eq(merchants.id, merchantId))
      .limit(1);

    // Contar depósitos
    const [depositStats] = await db
      .select({
        total: sql<number>`count(*)`,
        pending: sql<number>`count(*) filter (where ${deposits.status} = 'PENDING')`,
        credited: sql<number>`count(*) filter (where ${deposits.status} = 'CREDITED')`,
        totalMxn: sql<string>`coalesce(sum(${deposits.amountMxn}::numeric) filter (where ${deposits.status} = 'CREDITED'), 0)`,
      })
      .from(deposits)
      .where(eq(deposits.merchantId, merchantId));

    // Contar retiros
    const [withdrawalStats] = await db
      .select({
        total: sql<number>`count(*)`,
        completed: sql<number>`count(*) filter (where ${withdrawals.status} = 'COMPLETED')`,
        totalMxn: sql<string>`coalesce(sum(${withdrawals.amountMxn}::numeric) filter (where ${withdrawals.status} = 'COMPLETED'), 0)`,
      })
      .from(withdrawals)
      .where(eq(withdrawals.merchantId, merchantId));

    return {
      balanceMxn: parseFloat(merchant?.balanceMxn || "0"),
      deposits: {
        total: Number(depositStats?.total || 0),
        pending: Number(depositStats?.pending || 0),
        credited: Number(depositStats?.credited || 0),
        totalMxn: parseFloat(depositStats?.totalMxn || "0"),
      },
      withdrawals: {
        total: Number(withdrawalStats?.total || 0),
        completed: Number(withdrawalStats?.completed || 0),
        totalMxn: parseFloat(withdrawalStats?.totalMxn || "0"),
      },
    };
  }
}
