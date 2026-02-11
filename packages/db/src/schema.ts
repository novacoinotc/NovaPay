import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  decimal,
  integer,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================================
// ENUMS
// ============================================================

export const merchantRoleEnum = pgEnum("merchant_role", [
  "MERCHANT",
  "ADMIN",
]);

export const merchantStatusEnum = pgEnum("merchant_status", [
  "PENDING",
  "ACTIVE",
  "SUSPENDED",
  "BLOCKED",
]);

export const blockchainNetworkEnum = pgEnum("blockchain_network", [
  "TRON",
  "ETHEREUM",
  "BITCOIN",
]);

export const cryptoAssetEnum = pgEnum("crypto_asset", [
  "USDT_TRC20",
  "USDT_ERC20",
  "ETH",
  "BTC",
]);

export const depositStatusEnum = pgEnum("deposit_status", [
  "PENDING",
  "CONFIRMED",
  "SWEEPING",
  "SWEPT",
  "CONVERTING",
  "CREDITED",
  "FAILED",
]);

export const withdrawalStatusEnum = pgEnum("withdrawal_status", [
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
]);

export const paymentOrderStatusEnum = pgEnum("payment_order_status", [
  "PENDING",
  "PAID",
  "EXPIRED",
  "CANCELLED",
]);

export const employeeRoleEnum = pgEnum("employee_role", [
  "CASHIER",
  "MANAGER",
]);

// ============================================================
// MERCHANTS TABLE
// ============================================================

export const merchants = pgTable(
  "merchants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    businessName: varchar("business_name", { length: 200 }).notNull(),
    rfc: varchar("rfc", { length: 13 }).notNull(),
    phone: varchar("phone", { length: 15 }).notNull(),
    clabe: varchar("clabe", { length: 18 }).notNull(),

    // Configuración
    spreadPercent: decimal("spread_percent", { precision: 5, scale: 2 })
      .notNull()
      .default("3.00"),
    autoSpeiEnabled: boolean("auto_spei_enabled").notNull().default(true),

    // Saldo
    balanceMxn: decimal("balance_mxn", { precision: 15, scale: 2 })
      .notNull()
      .default("0.00"),

    // Rol
    role: merchantRoleEnum("role").notNull().default("MERCHANT"),

    // Estado
    status: merchantStatusEnum("status").notNull().default("PENDING"),

    // Metadata
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    emailIdx: index("merchants_email_idx").on(table.email),
    statusIdx: index("merchants_status_idx").on(table.status),
  })
);

// ============================================================
// WALLETS TABLE
// ============================================================

export const wallets = pgTable(
  "wallets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    merchantId: uuid("merchant_id")
      .notNull()
      .references(() => merchants.id, { onDelete: "cascade" }),

    network: blockchainNetworkEnum("network").notNull(),
    asset: cryptoAssetEnum("asset").notNull(),
    address: varchar("address", { length: 100 }).notNull(),

    // Índice HD Wallet - NO guardamos private key
    // La key se deriva: master_seed + walletIndex = private_key
    walletIndex: integer("wallet_index").notNull(),

    // Legacy: campo para migración (eliminar después)
    encryptedPrivateKey: text("encrypted_private_key"),

    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    merchantIdx: index("wallets_merchant_id_idx").on(table.merchantId),
    addressIdx: index("wallets_address_idx").on(table.address),
    networkAssetIdx: index("wallets_network_asset_idx").on(
      table.network,
      table.asset
    ),
    activeIdx: index("wallets_active_idx").on(table.isActive),
    walletIndexIdx: index("wallets_wallet_index_idx").on(table.walletIndex),
  })
);

// ============================================================
// DEPOSITS TABLE
// ============================================================

export const deposits = pgTable(
  "deposits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    merchantId: uuid("merchant_id")
      .notNull()
      .references(() => merchants.id, { onDelete: "cascade" }),
    walletId: uuid("wallet_id")
      .notNull()
      .references(() => wallets.id, { onDelete: "cascade" }),

    // Datos del depósito
    txHash: varchar("tx_hash", { length: 100 }).notNull(),
    network: blockchainNetworkEnum("network").notNull(),
    asset: cryptoAssetEnum("asset").notNull(),
    amountCrypto: decimal("amount_crypto", { precision: 30, scale: 18 }).notNull(),

    // Conversión a MXN
    amountMxn: decimal("amount_mxn", { precision: 15, scale: 2 }),
    exchangeRate: decimal("exchange_rate", { precision: 15, scale: 6 }),
    spreadPercent: decimal("spread_percent", { precision: 5, scale: 2 }),

    // Sweep
    sweepTxHash: varchar("sweep_tx_hash", { length: 100 }),

    // Estado
    status: depositStatusEnum("status").notNull().default("PENDING"),
    confirmations: integer("confirmations").notNull().default(0),

    // Timestamps
    detectedAt: timestamp("detected_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    sweptAt: timestamp("swept_at", { withTimezone: true }),
    creditedAt: timestamp("credited_at", { withTimezone: true }),
  },
  (table) => ({
    merchantIdx: index("deposits_merchant_id_idx").on(table.merchantId),
    walletIdx: index("deposits_wallet_id_idx").on(table.walletId),
    txHashIdx: index("deposits_tx_hash_idx").on(table.txHash),
    statusIdx: index("deposits_status_idx").on(table.status),
    detectedAtIdx: index("deposits_detected_at_idx").on(table.detectedAt),
  })
);

// ============================================================
// WITHDRAWALS TABLE
// ============================================================

export const withdrawals = pgTable(
  "withdrawals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    merchantId: uuid("merchant_id")
      .notNull()
      .references(() => merchants.id, { onDelete: "cascade" }),

    // Monto
    amountMxn: decimal("amount_mxn", { precision: 15, scale: 2 }).notNull(),
    feeMxn: decimal("fee_mxn", { precision: 15, scale: 2 }).notNull(),
    netAmountMxn: decimal("net_amount_mxn", { precision: 15, scale: 2 }).notNull(),

    // Destino SPEI
    clabe: varchar("clabe", { length: 18 }).notNull(),
    beneficiaryName: varchar("beneficiary_name", { length: 100 }),

    // Tracking SPEI
    speiReference: varchar("spei_reference", { length: 30 }),
    speiTrackingId: varchar("spei_tracking_id", { length: 50 }),

    // Estado
    status: withdrawalStatusEnum("status").notNull().default("PENDING"),
    failureReason: text("failure_reason"),

    // Timestamps
    requestedAt: timestamp("requested_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (table) => ({
    merchantIdx: index("withdrawals_merchant_id_idx").on(table.merchantId),
    statusIdx: index("withdrawals_status_idx").on(table.status),
    requestedAtIdx: index("withdrawals_requested_at_idx").on(table.requestedAt),
  })
);

// ============================================================
// HOT WALLET TRANSACTIONS (auditoría de nuestra hot wallet)
// ============================================================

export const hotWalletTransactions = pgTable(
  "hot_wallet_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    depositId: uuid("deposit_id").references(() => deposits.id, { onDelete: "set null" }),

    network: blockchainNetworkEnum("network").notNull(),
    asset: cryptoAssetEnum("asset").notNull(),
    txHash: varchar("tx_hash", { length: 100 }).notNull(),
    direction: varchar("direction", { length: 10 }).notNull(), // 'IN' o 'OUT'
    amount: decimal("amount", { precision: 30, scale: 18 }).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    depositIdx: index("hot_wallet_tx_deposit_id_idx").on(table.depositId),
    txHashIdx: index("hot_wallet_tx_hash_idx").on(table.txHash),
  })
);

// ============================================================
// PRICE HISTORY (para auditoría de tipos de cambio)
// ============================================================

export const priceHistory = pgTable(
  "price_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    asset: cryptoAssetEnum("asset").notNull(),
    priceMxn: decimal("price_mxn", { precision: 15, scale: 6 }).notNull(),
    priceUsd: decimal("price_usd", { precision: 15, scale: 6 }).notNull(),
    source: varchar("source", { length: 50 }).notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    assetIdx: index("price_history_asset_idx").on(table.asset),
    recordedAtIdx: index("price_history_recorded_at_idx").on(table.recordedAt),
  })
);

// ============================================================
// API KEYS (para comercios que quieran integrar vía API)
// ============================================================

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    merchantId: uuid("merchant_id")
      .notNull()
      .references(() => merchants.id, { onDelete: "cascade" }),

    keyHash: varchar("key_hash", { length: 64 }).notNull(), // SHA-256 del API key
    name: varchar("name", { length: 100 }).notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    merchantIdx: index("api_keys_merchant_id_idx").on(table.merchantId),
    keyHashIdx: index("api_keys_key_hash_idx").on(table.keyHash),
  })
);

// ============================================================
// SYSTEM CONFIG (para tracking de índices HD wallet, etc.)
// ============================================================

export const systemConfig = pgTable("system_config", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ============================================================
// PAYMENT ORDERS (cobros POS)
// ============================================================

export const paymentOrders = pgTable(
  "payment_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    merchantId: uuid("merchant_id")
      .notNull()
      .references(() => merchants.id, { onDelete: "cascade" }),
    walletId: uuid("wallet_id")
      .notNull()
      .references(() => wallets.id, { onDelete: "cascade" }),

    // Montos
    amountMxn: decimal("amount_mxn", { precision: 15, scale: 2 }).notNull(),
    tipMxn: decimal("tip_mxn", { precision: 15, scale: 2 })
      .notNull()
      .default("0.00"),
    totalMxn: decimal("total_mxn", { precision: 15, scale: 2 }).notNull(),
    amountUsdt: decimal("amount_usdt", { precision: 30, scale: 6 }).notNull(),

    // Info de tipo de cambio
    exchangeRate: decimal("exchange_rate", { precision: 15, scale: 6 }).notNull(),
    spread: decimal("spread", { precision: 5, scale: 2 }).notNull(),

    // Empleado que generó el cobro (null = dueño)
    employeeId: uuid("employee_id").references(() => employees.id, {
      onDelete: "set null",
    }),

    // Estado
    status: paymentOrderStatusEnum("status").notNull().default("PENDING"),
    depositId: uuid("deposit_id").references(() => deposits.id, {
      onDelete: "set null",
    }),

    // Timestamps
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    merchantIdx: index("payment_orders_merchant_id_idx").on(table.merchantId),
    walletIdx: index("payment_orders_wallet_id_idx").on(table.walletId),
    statusIdx: index("payment_orders_status_idx").on(table.status),
    expiresAtIdx: index("payment_orders_expires_at_idx").on(table.expiresAt),
    depositIdx: index("payment_orders_deposit_id_idx").on(table.depositId),
    employeeIdx: index("payment_orders_employee_id_idx").on(table.employeeId),
  })
);

// ============================================================
// EMPLOYEES TABLE (sub-usuarios de un merchant)
// ============================================================

export const employees = pgTable(
  "employees",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    merchantId: uuid("merchant_id")
      .notNull()
      .references(() => merchants.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 200 }).notNull(),
    pin: varchar("pin", { length: 255 }).notNull(),
    role: employeeRoleEnum("role").notNull().default("CASHIER"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    merchantIdx: index("employees_merchant_id_idx").on(table.merchantId),
    activeIdx: index("employees_active_idx").on(table.isActive),
  })
);

// ============================================================
// RELATIONS
// ============================================================

export const merchantsRelations = relations(merchants, ({ many }) => ({
  wallets: many(wallets),
  deposits: many(deposits),
  withdrawals: many(withdrawals),
  apiKeys: many(apiKeys),
  paymentOrders: many(paymentOrders),
  employees: many(employees),
}));

export const walletsRelations = relations(wallets, ({ one, many }) => ({
  merchant: one(merchants, {
    fields: [wallets.merchantId],
    references: [merchants.id],
  }),
  deposits: many(deposits),
}));

export const depositsRelations = relations(deposits, ({ one }) => ({
  merchant: one(merchants, {
    fields: [deposits.merchantId],
    references: [merchants.id],
  }),
  wallet: one(wallets, {
    fields: [deposits.walletId],
    references: [wallets.id],
  }),
}));

export const withdrawalsRelations = relations(withdrawals, ({ one }) => ({
  merchant: one(merchants, {
    fields: [withdrawals.merchantId],
    references: [merchants.id],
  }),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  merchant: one(merchants, {
    fields: [apiKeys.merchantId],
    references: [merchants.id],
  }),
}));

export const paymentOrdersRelations = relations(paymentOrders, ({ one }) => ({
  merchant: one(merchants, {
    fields: [paymentOrders.merchantId],
    references: [merchants.id],
  }),
  wallet: one(wallets, {
    fields: [paymentOrders.walletId],
    references: [wallets.id],
  }),
  deposit: one(deposits, {
    fields: [paymentOrders.depositId],
    references: [deposits.id],
  }),
  employee: one(employees, {
    fields: [paymentOrders.employeeId],
    references: [employees.id],
  }),
}));

export const employeesRelations = relations(employees, ({ one, many }) => ({
  merchant: one(merchants, {
    fields: [employees.merchantId],
    references: [merchants.id],
  }),
  paymentOrders: many(paymentOrders),
}));
