import { getDb, priceHistory } from "@novapay/db";
import { desc, eq } from "drizzle-orm";
import { getMultipleQuotes } from "@novapay/crypto";
import { CryptoAsset, BUSINESS_RULES } from "@novapay/shared";

export class PriceUpdater {
  private lastUpdateTime: number = 0;
  private updateIntervalMs: number = BUSINESS_RULES.PRICE_POLL_INTERVAL_MS;

  /**
   * Actualiza los precios si ha pasado suficiente tiempo
   */
  async updateIfNeeded(): Promise<void> {
    const now = Date.now();

    if (now - this.lastUpdateTime < this.updateIntervalMs) {
      return;
    }

    await this.updatePrices();
    this.lastUpdateTime = now;
  }

  /**
   * Actualiza los precios de todos los assets soportados
   */
  async updatePrices(): Promise<void> {
    const assets: CryptoAsset[] = [
      "USDT_TRC20",
      "USDT_ERC20",
      "ETH",
      "BTC",
    ];

    try {
      const quotes = await getMultipleQuotes(assets);
      const db = getDb();

      // Guardar en historial de precios
      for (const [asset, quote] of quotes) {
        await db.insert(priceHistory).values({
          asset,
          priceMxn: quote.priceMxn.toString(),
          priceUsd: quote.priceUsd.toString(),
          source: quote.source,
        });
      }

      const usdtPrice = quotes.get("USDT_TRC20");
      if (usdtPrice) {
        console.log(`Prices updated: USDT=${usdtPrice.priceMxn.toFixed(2)} MXN`);
      }
    } catch (error) {
      console.error("Failed to update prices:", error);
    }
  }

  /**
   * Obtiene el precio actual de un asset desde la base de datos
   */
  async getCurrentPrice(asset: CryptoAsset): Promise<number | null> {
    const db = getDb();

    const [latest] = await db
      .select()
      .from(priceHistory)
      .where(eq(priceHistory.asset, asset))
      .orderBy(desc(priceHistory.recordedAt))
      .limit(1);

    return latest ? parseFloat(latest.priceMxn) : null;
  }
}
