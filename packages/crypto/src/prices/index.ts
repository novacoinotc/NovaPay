import { CryptoAsset, type PriceQuote } from "@novapay/shared";

const BINANCE_API = "https://api.binance.com/api/v3";

// Mapeo de assets a símbolos de Binance
const ASSET_TO_BINANCE_SYMBOL: Record<CryptoAsset, string> = {
  USDT_TRC20: "USDT",
  USDT_ERC20: "USDT",
  ETH: "ETH",
  BTC: "BTC",
};

interface BinanceTickerPrice {
  symbol: string;
  price: string;
}

/**
 * Obtiene el precio actual de un asset en USD desde Binance
 */
export async function getPriceUsd(asset: CryptoAsset): Promise<number> {
  const symbol = ASSET_TO_BINANCE_SYMBOL[asset];

  // USDT es aproximadamente 1 USD
  if (symbol === "USDT") {
    return 1.0;
  }

  try {
    const response = await fetch(
      `${BINANCE_API}/ticker/price?symbol=${symbol}USDT`
    );
    const data = (await response.json()) as BinanceTickerPrice;
    return parseFloat(data.price);
  } catch (error) {
    console.error(`Error fetching ${symbol} price:`, error);
    throw new Error(`Failed to fetch ${symbol} price from Binance`);
  }
}

/**
 * Obtiene el precio USD/MXN desde Binance
 */
export async function getUsdMxnRate(): Promise<number> {
  try {
    // Binance tiene el par USDMXN a través de stablecoins
    // Usamos MXNUSDT y lo invertimos
    const response = await fetch(`${BINANCE_API}/ticker/price?symbol=USDTMXN`);

    if (!response.ok) {
      // Fallback: usar un servicio alternativo o valor aproximado
      // En producción, usar un servicio de forex confiable
      return await getUsdMxnFromAlternative();
    }

    const data = (await response.json()) as BinanceTickerPrice;
    return parseFloat(data.price);
  } catch (error) {
    console.error("Error fetching USD/MXN rate:", error);
    return await getUsdMxnFromAlternative();
  }
}

/**
 * Fuente alternativa para USD/MXN
 * En producción, reemplazar con API de forex real
 */
async function getUsdMxnFromAlternative(): Promise<number> {
  try {
    // Usar exchangerate-api como backup (tiene tier gratuito)
    const response = await fetch(
      "https://api.exchangerate-api.com/v4/latest/USD"
    );
    const data = (await response.json()) as { rates: { MXN: number } };
    return data.rates.MXN;
  } catch (error) {
    console.error("Error fetching from alternative source:", error);
    // Valor fallback de emergencia (actualizar regularmente)
    return 17.5;
  }
}

/**
 * Obtiene cotización completa de un asset
 */
export async function getQuote(asset: CryptoAsset): Promise<PriceQuote> {
  const [priceUsd, usdMxnRate] = await Promise.all([
    getPriceUsd(asset),
    getUsdMxnRate(),
  ]);

  return {
    asset,
    priceUsd,
    priceMxn: priceUsd * usdMxnRate,
    timestamp: new Date(),
    source: "binance",
  };
}

/**
 * Obtiene cotizaciones de múltiples assets
 */
export async function getMultipleQuotes(
  assets: CryptoAsset[]
): Promise<Map<CryptoAsset, PriceQuote>> {
  const quotes = new Map<CryptoAsset, PriceQuote>();
  const usdMxnRate = await getUsdMxnRate();

  // Obtener precios en paralelo
  const pricePromises = assets.map(async (asset) => {
    const priceUsd = await getPriceUsd(asset);
    return { asset, priceUsd };
  });

  const prices = await Promise.all(pricePromises);

  for (const { asset, priceUsd } of prices) {
    quotes.set(asset, {
      asset,
      priceUsd,
      priceMxn: priceUsd * usdMxnRate,
      timestamp: new Date(),
      source: "binance",
    });
  }

  return quotes;
}

/**
 * Calcula el monto en MXN para una cantidad de crypto
 */
export async function calculateMxnValue(
  asset: CryptoAsset,
  amount: number
): Promise<{ mxn: number; rate: number }> {
  const quote = await getQuote(asset);
  return {
    mxn: amount * quote.priceMxn,
    rate: quote.priceMxn,
  };
}

/**
 * Cache simple para precios (evitar llamadas excesivas)
 */
class PriceCache {
  private cache: Map<string, { quote: PriceQuote; expiresAt: number }> =
    new Map();
  private ttlMs: number;

  constructor(ttlMs: number = 30000) {
    // 30 segundos default
    this.ttlMs = ttlMs;
  }

  async getQuote(asset: CryptoAsset): Promise<PriceQuote> {
    const key = asset;
    const cached = this.cache.get(key);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.quote;
    }

    const quote = await getQuote(asset);
    this.cache.set(key, {
      quote,
      expiresAt: Date.now() + this.ttlMs,
    });

    return quote;
  }

  clear(): void {
    this.cache.clear();
  }
}

// Exportar instancia singleton del cache
export const priceCache = new PriceCache();
