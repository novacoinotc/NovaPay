import { BlockchainNetwork, CryptoAsset } from "../types";

// ============================================================
// BLOCKCHAIN CONFIGURATION
// ============================================================

export const NETWORK_CONFIG = {
  [BlockchainNetwork.TRON]: {
    name: "Tron",
    symbol: "TRX",
    explorer: "https://tronscan.org",
    explorerTx: "https://tronscan.org/#/transaction/",
    explorerAddress: "https://tronscan.org/#/address/",
    requiredConfirmations: 20,
    blockTimeSeconds: 3,
    mainnet: {
      fullHost: "https://api.trongrid.io",
    },
    testnet: {
      fullHost: "https://api.shasta.trongrid.io",
    },
  },
  [BlockchainNetwork.ETHEREUM]: {
    name: "Ethereum",
    symbol: "ETH",
    explorer: "https://etherscan.io",
    explorerTx: "https://etherscan.io/tx/",
    explorerAddress: "https://etherscan.io/address/",
    requiredConfirmations: 12,
    blockTimeSeconds: 12,
    mainnet: {
      chainId: 1,
    },
    testnet: {
      chainId: 11155111, // Sepolia
    },
  },
  [BlockchainNetwork.BITCOIN]: {
    name: "Bitcoin",
    symbol: "BTC",
    explorer: "https://blockchain.info",
    explorerTx: "https://blockchain.info/tx/",
    explorerAddress: "https://blockchain.info/address/",
    requiredConfirmations: 3,
    blockTimeSeconds: 600,
    mainnet: {},
    testnet: {},
  },
} as const;

// ============================================================
// ASSET CONFIGURATION
// ============================================================

export const ASSET_CONFIG = {
  [CryptoAsset.USDT_TRC20]: {
    name: "Tether USD (TRC20)",
    symbol: "USDT",
    network: BlockchainNetwork.TRON,
    decimals: 6,
    contractAddress: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", // Mainnet
    minDeposit: "1", // 1 USDT mínimo
    minSweep: "100", // Acumular mínimo 100 USDT antes de sweep
  },
  [CryptoAsset.USDT_ERC20]: {
    name: "Tether USD (ERC20)",
    symbol: "USDT",
    network: BlockchainNetwork.ETHEREUM,
    decimals: 6,
    contractAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7", // Mainnet
    minDeposit: "10", // 10 USDT mínimo (por fees ETH)
    minSweep: "50", // 50 USDT mínimo para sweep (gas costs)
  },
  [CryptoAsset.ETH]: {
    name: "Ethereum",
    symbol: "ETH",
    network: BlockchainNetwork.ETHEREUM,
    decimals: 18,
    contractAddress: null,
    minDeposit: "0.01",
    minSweep: "0.05",
  },
  [CryptoAsset.BTC]: {
    name: "Bitcoin",
    symbol: "BTC",
    network: BlockchainNetwork.BITCOIN,
    decimals: 8,
    contractAddress: null,
    minDeposit: "0.0001",
    minSweep: "0.001",
  },
} as const;

// ============================================================
// BUSINESS RULES
// ============================================================

export const BUSINESS_RULES = {
  // Spread/comisión
  DEFAULT_SPREAD_PERCENT: 3,
  MIN_SPREAD_PERCENT: 0,
  MAX_SPREAD_PERCENT: 10,

  // Retiros SPEI
  MIN_WITHDRAWAL_MXN: 100,
  MAX_WITHDRAWAL_MXN: 500000,
  WITHDRAWAL_FEE_MXN: 0,

  // Polling del worker
  WALLET_POLL_INTERVAL_MS: 15000, // 15 segundos (1 API call per cycle con contract events)
  PRICE_POLL_INTERVAL_MS: 30000, // 30 segundos

  // Contract event monitoring
  CONTRACT_EVENTS_LOOKBACK_MS: 60000, // 1 minuto de lookback inicial

  // Rate limiting
  API_RATE_LIMIT_PER_MINUTE: 60,
  WEBHOOK_RATE_LIMIT_PER_MINUTE: 100,

  // Payment orders (Cobrar/POS)
  PAYMENT_ORDER_EXPIRY_MINUTES: 30,
  PAYMENT_ORDER_TOLERANCE_PERCENT: 1,
  MIN_PAYMENT_ORDER_MXN: 10,
  MAX_PAYMENT_ORDER_MXN: 500000,
} as const;

// ============================================================
// API ENDPOINTS (para worker → API communication)
// ============================================================

export const API_ENDPOINTS = {
  DEPOSIT_DETECTED: "/api/internal/deposits/detected",
  DEPOSIT_CONFIRMED: "/api/internal/deposits/confirmed",
  DEPOSIT_SWEPT: "/api/internal/deposits/swept",
  HEALTH_CHECK: "/api/health",
} as const;

// ============================================================
// ERROR CODES
// ============================================================

export const ERROR_CODES = {
  // Auth
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  INVALID_TOKEN: "INVALID_TOKEN",

  // Merchant
  MERCHANT_NOT_FOUND: "MERCHANT_NOT_FOUND",
  MERCHANT_SUSPENDED: "MERCHANT_SUSPENDED",
  INVALID_RFC: "INVALID_RFC",
  INVALID_CLABE: "INVALID_CLABE",

  // Wallet
  WALLET_NOT_FOUND: "WALLET_NOT_FOUND",
  WALLET_GENERATION_FAILED: "WALLET_GENERATION_FAILED",

  // Deposit
  DEPOSIT_NOT_FOUND: "DEPOSIT_NOT_FOUND",
  DEPOSIT_BELOW_MINIMUM: "DEPOSIT_BELOW_MINIMUM",
  SWEEP_FAILED: "SWEEP_FAILED",

  // Withdrawal
  INSUFFICIENT_BALANCE: "INSUFFICIENT_BALANCE",
  WITHDRAWAL_BELOW_MINIMUM: "WITHDRAWAL_BELOW_MINIMUM",
  WITHDRAWAL_ABOVE_MAXIMUM: "WITHDRAWAL_ABOVE_MAXIMUM",
  SPEI_FAILED: "SPEI_FAILED",

  // General
  INTERNAL_ERROR: "INTERNAL_ERROR",
  RATE_LIMITED: "RATE_LIMITED",
  VALIDATION_ERROR: "VALIDATION_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
