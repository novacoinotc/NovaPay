import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, deposits, merchants, hotWalletTransactions } from "@novapay/db";
import { eq, sql } from "@novapay/db";
import { getQuote } from "@novapay/crypto";
import { calculateMxnAmount, CryptoAsset } from "@novapay/shared";
import { SpeiService } from "@/lib/services/spei-service";

const depositSweptSchema = z.object({
  depositId: z.string().uuid(),
  sweepTxHash: z.string(),
  amountSwept: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    // Verificar API key interno
    const apiKey = request.headers.get("x-internal-api-key");
    if (apiKey !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Invalid API key" } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const data = depositSweptSchema.parse(body);

    const db = getDb();

    // Obtener depósito
    const [deposit] = await db
      .select()
      .from(deposits)
      .where(eq(deposits.id, data.depositId))
      .limit(1);

    if (!deposit) {
      return NextResponse.json(
        { success: false, error: { code: "DEPOSIT_NOT_FOUND", message: "Deposit not found" } },
        { status: 404 }
      );
    }

    if (deposit.status === "CREDITED") {
      return NextResponse.json({
        success: true,
        data: { message: "Deposit already credited" },
      });
    }

    // Obtener comercio
    const [merchant] = await db
      .select()
      .from(merchants)
      .where(eq(merchants.id, deposit.merchantId))
      .limit(1);

    if (!merchant) {
      return NextResponse.json(
        { success: false, error: { code: "MERCHANT_NOT_FOUND", message: "Merchant not found" } },
        { status: 404 }
      );
    }

    // Actualizar depósito como swept
    await db
      .update(deposits)
      .set({
        status: "SWEPT",
        sweepTxHash: data.sweepTxHash,
        sweptAt: new Date(),
      })
      .where(eq(deposits.id, data.depositId));

    // Registrar transacción de hot wallet
    await db.insert(hotWalletTransactions).values({
      depositId: deposit.id,
      network: deposit.network,
      asset: deposit.asset,
      txHash: data.sweepTxHash,
      direction: "IN",
      amount: data.amountSwept,
    });

    // Obtener precio actual y calcular MXN
    const quote = await getQuote(deposit.asset as CryptoAsset);
    const spreadPercent = parseFloat(merchant.spreadPercent);
    const { netMxn } = calculateMxnAmount(
      deposit.amountCrypto,
      quote.priceMxn,
      spreadPercent
    );

    // Actualizar depósito con MXN y marcar como credited
    await db
      .update(deposits)
      .set({
        status: "CREDITED",
        amountMxn: netMxn.toFixed(2),
        exchangeRate: quote.priceMxn.toFixed(6),
        spreadPercent: spreadPercent.toFixed(2),
        creditedAt: new Date(),
      })
      .where(eq(deposits.id, data.depositId));

    // Incrementar balance del comercio
    await db
      .update(merchants)
      .set({
        balanceMxn: sql`${merchants.balanceMxn} + ${netMxn.toFixed(2)}`,
        updatedAt: new Date(),
      })
      .where(eq(merchants.id, merchant.id));

    console.log(`Credited ${netMxn.toFixed(2)} MXN to merchant ${merchant.id} from deposit ${deposit.id}`);

    // Si tiene auto-SPEI activado, crear retiro automático
    if (merchant.autoSpeiEnabled) {
      console.log(`Auto-SPEI enabled for merchant ${merchant.id}, creating withdrawal...`);

      // Importar el servicio de crédito para crear el retiro
      const { CreditService } = await import("@/lib/services/credit-service");

      const withdrawalResult = await CreditService.processWithdrawal(
        merchant.id,
        netMxn
      );

      if (withdrawalResult.success && withdrawalResult.withdrawalId) {
        // Procesar SPEI inmediatamente
        await SpeiService.processWithdrawal(withdrawalResult.withdrawalId);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        depositId: deposit.id,
        amountMxn: netMxn.toFixed(2),
        credited: true,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: error.message } },
        { status: 400 }
      );
    }

    console.error("Error processing deposit swept:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      { status: 500 }
    );
  }
}
