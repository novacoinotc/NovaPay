import { z } from "zod";

// ============================================================
// ENUMS
// ============================================================

export const BlockchainNetwork = {
  TRON: "TRON",
  ETHEREUM: "ETHEREUM",
  BITCOIN: "BITCOIN",
} as const;

export type BlockchainNetwork =
  (typeof BlockchainNetwork)[keyof typeof BlockchainNetwork];

export const CryptoAsset = {
  USDT_TRC20: "USDT_TRC20",
  USDT_ERC20: "USDT_ERC20",
  ETH: "ETH",
  BTC: "BTC",
} as const;

export type CryptoAsset = (typeof CryptoAsset)[keyof typeof CryptoAsset];

export const DepositStatus = {
  PENDING: "PENDING", // Detectado, esperando confirmaciones
  CONFIRMED: "CONFIRMED", // Confirmaciones suficientes
  SWEEPING: "SWEEPING", // En proceso de sweep
  SWEPT: "SWEPT", // Movido a hot wallet
  CONVERTING: "CONVERTING", // En conversión a MXN
  CREDITED: "CREDITED", // Acreditado al comercio
  FAILED: "FAILED", // Error en el proceso
} as const;

export type DepositStatus = (typeof DepositStatus)[keyof typeof DepositStatus];

export const WithdrawalStatus = {
  PENDING: "PENDING", // Solicitado
  PROCESSING: "PROCESSING", // En proceso con SPEI
  COMPLETED: "COMPLETED", // SPEI enviado exitosamente
  FAILED: "FAILED", // Error
} as const;

export type WithdrawalStatus =
  (typeof WithdrawalStatus)[keyof typeof WithdrawalStatus];

export const MerchantStatus = {
  PENDING: "PENDING", // Registro incompleto
  ACTIVE: "ACTIVE", // Activo
  SUSPENDED: "SUSPENDED", // Suspendido
  BLOCKED: "BLOCKED", // Bloqueado
} as const;

export type MerchantStatus =
  (typeof MerchantStatus)[keyof typeof MerchantStatus];

// ============================================================
// ZOD SCHEMAS
// ============================================================

export const merchantSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  businessName: z.string().min(2).max(200),
  rfc: z.string().min(12).max(13),
  phone: z.string().min(10).max(15),
  clabe: z.string().length(18),
  spreadPercent: z.string().default("3.00"), // Drizzle returns decimal as string
  autoSpeiEnabled: z.boolean().default(true),
  balanceMxn: z.string().default("0.00"), // Drizzle returns decimal as string
  status: z.nativeEnum(MerchantStatus).default("PENDING"),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const walletSchema = z.object({
  id: z.string().uuid(),
  merchantId: z.string().uuid(),
  network: z.nativeEnum(BlockchainNetwork),
  asset: z.nativeEnum(CryptoAsset),
  address: z.string(),
  encryptedPrivateKey: z.string(),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
});

export const depositSchema = z.object({
  id: z.string().uuid(),
  merchantId: z.string().uuid(),
  walletId: z.string().uuid(),
  txHash: z.string(),
  network: z.nativeEnum(BlockchainNetwork),
  asset: z.nativeEnum(CryptoAsset),
  amountCrypto: z.string(), // String para precisión decimal
  amountMxn: z.string().nullable(),
  exchangeRate: z.string().nullable(),
  spreadPercent: z.string().nullable(), // Drizzle returns decimal as string
  sweepTxHash: z.string().nullable(),
  status: z.nativeEnum(DepositStatus).default("PENDING"),
  confirmations: z.number().default(0),
  detectedAt: z.date(),
  confirmedAt: z.date().nullable(),
  sweptAt: z.date().nullable(),
  creditedAt: z.date().nullable(),
});

export const withdrawalSchema = z.object({
  id: z.string().uuid(),
  merchantId: z.string().uuid(),
  amountMxn: z.string(),
  feeMxn: z.string(),
  netAmountMxn: z.string(),
  clabe: z.string().length(18),
  beneficiaryName: z.string().nullable(),
  speiReference: z.string().nullable(),
  speiTrackingId: z.string().nullable(),
  status: z.nativeEnum(WithdrawalStatus).default("PENDING"),
  failureReason: z.string().nullable(),
  requestedAt: z.date(),
  processedAt: z.date().nullable(),
});

// ============================================================
// TYPES INFERRED FROM SCHEMAS
// ============================================================

export type Merchant = z.infer<typeof merchantSchema>;
export type Wallet = z.infer<typeof walletSchema>;
export type Deposit = z.infer<typeof depositSchema>;
export type Withdrawal = z.infer<typeof withdrawalSchema>;

// ============================================================
// API TYPES
// ============================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface PriceQuote {
  asset: CryptoAsset;
  priceMxn: number;
  priceUsd: number;
  timestamp: Date;
  source: string;
}

export interface DepositNotification {
  depositId: string;
  merchantId: string;
  txHash: string;
  asset: CryptoAsset;
  amountCrypto: string;
  status: DepositStatus;
}

export interface SweepResult {
  success: boolean;
  depositId: string;
  sweepTxHash?: string;
  error?: string;
}
