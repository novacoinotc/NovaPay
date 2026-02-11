import { neon, NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Re-export schema
export * from "./schema";

// Re-export drizzle-orm utilities to ensure single instance
export { eq, ne, gt, gte, lt, lte, sql, and, or, desc, asc, count, sum, isNull } from "drizzle-orm";

// Tipo del cliente de base de datos
export type Database = ReturnType<typeof createDb>;

/**
 * Crea una instancia del cliente de base de datos
 * @param connectionString - Connection string de Neon PostgreSQL
 */
export function createDb(connectionString: string) {
  const sql: NeonQueryFunction<boolean, boolean> = neon(connectionString);
  return drizzle(sql, { schema });
}

/**
 * Cliente singleton para usar en la aplicación
 * Se inicializa con la variable de entorno DATABASE_URL
 */
let _db: Database | null = null;

export function getDb(): Database {
  if (!_db) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    _db = createDb(connectionString);
  }
  return _db;
}

// Tipos inferidos del schema para usar en la app
export type MerchantInsert = typeof schema.merchants.$inferInsert;
export type MerchantSelect = typeof schema.merchants.$inferSelect;

export type WalletInsert = typeof schema.wallets.$inferInsert;
export type WalletSelect = typeof schema.wallets.$inferSelect;

export type DepositInsert = typeof schema.deposits.$inferInsert;
export type DepositSelect = typeof schema.deposits.$inferSelect;

export type WithdrawalInsert = typeof schema.withdrawals.$inferInsert;
export type WithdrawalSelect = typeof schema.withdrawals.$inferSelect;

export type HotWalletTransactionInsert = typeof schema.hotWalletTransactions.$inferInsert;
export type HotWalletTransactionSelect = typeof schema.hotWalletTransactions.$inferSelect;

export type PriceHistoryInsert = typeof schema.priceHistory.$inferInsert;
export type PriceHistorySelect = typeof schema.priceHistory.$inferSelect;

export type ApiKeyInsert = typeof schema.apiKeys.$inferInsert;
export type ApiKeySelect = typeof schema.apiKeys.$inferSelect;

export type SystemConfigInsert = typeof schema.systemConfig.$inferInsert;
export type SystemConfigSelect = typeof schema.systemConfig.$inferSelect;

export type PaymentOrderInsert = typeof schema.paymentOrders.$inferInsert;
export type PaymentOrderSelect = typeof schema.paymentOrders.$inferSelect;

export type EmployeeInsert = typeof schema.employees.$inferInsert;
export type EmployeeSelect = typeof schema.employees.$inferSelect;
