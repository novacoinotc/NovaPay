import { ASSET_CONFIG, BUSINESS_RULES } from "../constants";
import { CryptoAsset } from "../types";

// ============================================================
// CRYPTO UTILITIES
// ============================================================

/**
 * Convierte cantidad crypto a su representación con decimales
 */
export function formatCryptoAmount(
  amount: string | number,
  asset: CryptoAsset
): string {
  const config = ASSET_CONFIG[asset];
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return num.toFixed(config.decimals);
}

/**
 * Convierte de unidades base (wei, satoshi, sun) a unidades normales
 */
export function fromBaseUnits(
  amount: string | bigint,
  decimals: number
): string {
  const amountBigInt =
    typeof amount === "string" ? BigInt(amount) : amount;
  const divisor = BigInt(10) ** BigInt(decimals);
  const integerPart = amountBigInt / divisor;
  const remainder = amountBigInt % divisor;

  if (remainder === BigInt(0)) {
    return integerPart.toString();
  }

  const decimalPart = remainder.toString().padStart(decimals, "0");
  return `${integerPart}.${decimalPart}`.replace(/\.?0+$/, "");
}

/**
 * Convierte de unidades normales a unidades base
 */
export function toBaseUnits(amount: string | number, decimals: number): bigint {
  const amountStr = typeof amount === "number" ? amount.toString() : amount;
  const [integerPart, decimalPart = ""] = amountStr.split(".");
  const paddedDecimal = decimalPart.padEnd(decimals, "0").slice(0, decimals);
  return BigInt(integerPart + paddedDecimal);
}

// ============================================================
// MXN UTILITIES
// ============================================================

/**
 * Calcula el monto MXN después del spread
 */
export function calculateMxnAmount(
  cryptoAmount: string | number,
  exchangeRate: number,
  spreadPercent: number = BUSINESS_RULES.DEFAULT_SPREAD_PERCENT
): { grossMxn: number; spreadMxn: number; netMxn: number } {
  const amount =
    typeof cryptoAmount === "string" ? parseFloat(cryptoAmount) : cryptoAmount;
  const grossMxn = amount * exchangeRate;
  const spreadMxn = grossMxn * (spreadPercent / 100);
  const netMxn = grossMxn - spreadMxn;

  return {
    grossMxn: Math.round(grossMxn * 100) / 100,
    spreadMxn: Math.round(spreadMxn * 100) / 100,
    netMxn: Math.round(netMxn * 100) / 100,
  };
}

/**
 * Formatea cantidad MXN para display
 */
export function formatMxn(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(num);
}

// ============================================================
// VALIDATION UTILITIES
// ============================================================

/**
 * Valida RFC mexicano (persona física o moral)
 */
export function isValidRfc(rfc: string): boolean {
  // RFC persona física: 13 caracteres
  // RFC persona moral: 12 caracteres
  const rfcRegex =
    /^([A-ZÑ&]{3,4})(\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])([A-Z\d]{2})([A-Z\d])$/i;
  return rfcRegex.test(rfc.toUpperCase());
}

/**
 * Valida CLABE interbancaria (18 dígitos con dígito verificador)
 */
export function isValidClabe(clabe: string): boolean {
  if (!/^\d{18}$/.test(clabe)) return false;

  // Pesos para el algoritmo de verificación
  const weights = [3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7];
  let sum = 0;

  for (let i = 0; i < 17; i++) {
    const digit = parseInt(clabe[i], 10);
    const product = (digit * weights[i]) % 10;
    sum += product;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(clabe[17], 10);
}

/**
 * Valida dirección de wallet según la red
 */
export function isValidAddress(
  address: string,
  asset: CryptoAsset
): boolean {
  const config = ASSET_CONFIG[asset];

  switch (config.network) {
    case "TRON":
      // Tron addresses start with T and are 34 characters
      return /^T[A-Za-z1-9]{33}$/.test(address);
    case "ETHEREUM":
      // Ethereum addresses are 42 characters (0x + 40 hex)
      return /^0x[a-fA-F0-9]{40}$/.test(address);
    case "BITCOIN":
      // Bitcoin addresses (simplified check)
      return /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}$/.test(address);
    default:
      return false;
  }
}

// ============================================================
// DATE UTILITIES
// ============================================================

/**
 * Formatea fecha para display
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

/**
 * Obtiene timestamp ISO actual
 */
export function nowISO(): string {
  return new Date().toISOString();
}

// ============================================================
// MISC UTILITIES
// ============================================================

/**
 * Genera un ID de referencia único para SPEI
 */
export function generateSpeiReference(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `NP${timestamp}${random}`.toUpperCase().slice(0, 20);
}

/**
 * Trunca una dirección de wallet para display
 */
export function truncateAddress(address: string, chars: number = 6): string {
  if (address.length <= chars * 2) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Delay helper para async/await
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry helper con backoff exponencial
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts) {
        const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
        await delay(delayMs);
      }
    }
  }

  throw lastError;
}
