import { getDb, wallets, systemConfig } from "@novapay/db";
import { eq, and, sql } from "@novapay/db";
import { deriveTronAddress, deriveEthAddress } from "@novapay/crypto";
import { CryptoAsset, BlockchainNetwork } from "@novapay/shared";

// La semilla maestra - NUNCA se guarda en base de datos
// Solo existe en variables de entorno
const MASTER_MNEMONIC = process.env.HD_WALLET_MNEMONIC!;

if (!MASTER_MNEMONIC && process.env.NODE_ENV === "production") {
  console.error("⚠️ CRITICAL: HD_WALLET_MNEMONIC not configured!");
}

export class WalletService {
  /**
   * Obtiene el siguiente índice disponible para wallets
   * Usa una tabla de configuración para tracking atómico
   */
  private static async getNextWalletIndex(): Promise<number> {
    const db = getDb();
    const key = "last_wallet_index";

    // Intentar obtener el último índice
    const [config] = await db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.key, key))
      .limit(1);

    if (!config) {
      // Primera vez - inicializar en 0
      await db.insert(systemConfig).values({
        key,
        value: "0",
        updatedAt: new Date(),
      });
      return 0;
    }

    // Incrementar atómicamente
    const nextIndex = parseInt(config.value) + 1;
    await db
      .update(systemConfig)
      .set({
        value: nextIndex.toString(),
        updatedAt: new Date(),
      })
      .where(eq(systemConfig.key, key));

    return nextIndex;
  }

  /**
   * Genera todas las wallets para un comercio nuevo
   */
  static async generateWalletsForMerchant(merchantId: string): Promise<void> {
    // Generar wallet USDT-TRC20 (Tron)
    await this.generateWallet(merchantId, "USDT_TRC20", "TRON");

    // Generar wallet USDT-ERC20 (Ethereum)
    await this.generateWallet(merchantId, "USDT_ERC20", "ETHEREUM");
  }

  /**
   * Genera una wallet específica para un comercio usando HD Wallet
   * NO almacena private key - solo el índice de derivación
   */
  static async generateWallet(
    merchantId: string,
    asset: CryptoAsset,
    network: BlockchainNetwork
  ): Promise<{ address: string }> {
    const db = getDb();

    // Verificar si ya existe una wallet para este asset
    const [existing] = await db
      .select()
      .from(wallets)
      .where(
        and(
          eq(wallets.merchantId, merchantId),
          eq(wallets.asset, asset)
        )
      )
      .limit(1);

    if (existing) {
      return { address: existing.address };
    }

    // Obtener el siguiente índice disponible
    const walletIndex = await this.getNextWalletIndex();

    let address: string;

    // Derivar dirección según la red (SIN obtener private key)
    switch (network) {
      case "TRON": {
        const derived = deriveTronAddress(MASTER_MNEMONIC, walletIndex);
        address = derived.address;
        break;
      }

      case "ETHEREUM": {
        const derived = deriveEthAddress(MASTER_MNEMONIC, walletIndex);
        address = derived.address;
        break;
      }

      default:
        throw new Error(`Network ${network} not supported for wallet generation`);
    }

    // Guardar en la base de datos - SIN private key
    await db.insert(wallets).values({
      merchantId,
      network,
      asset,
      address,
      walletIndex, // Solo guardamos el índice
      isActive: true,
    });

    console.log(`Generated ${network} wallet for merchant ${merchantId}: ${address} (index: ${walletIndex})`);

    return { address };
  }

  /**
   * Obtiene todas las wallets de un comercio
   */
  static async getWalletsByMerchant(merchantId: string) {
    const db = getDb();

    const merchantWallets = await db
      .select({
        id: wallets.id,
        network: wallets.network,
        asset: wallets.asset,
        address: wallets.address,
        isActive: wallets.isActive,
        createdAt: wallets.createdAt,
      })
      .from(wallets)
      .where(eq(wallets.merchantId, merchantId));

    return merchantWallets;
  }

  /**
   * Obtiene una wallet por dirección
   */
  static async getWalletByAddress(address: string) {
    const db = getDb();

    const [wallet] = await db
      .select()
      .from(wallets)
      .where(eq(wallets.address, address))
      .limit(1);

    return wallet;
  }

  /**
   * Obtiene todas las wallets activas (para el worker)
   */
  static async getAllActiveWallets() {
    const db = getDb();

    return db
      .select()
      .from(wallets)
      .where(eq(wallets.isActive, true));
  }

  /**
   * Obtiene el índice de wallet para derivar la private key
   * ⚠️ Solo usar en el worker para sweep
   */
  static async getWalletIndexForSweep(walletId: string): Promise<number | null> {
    const db = getDb();

    const [wallet] = await db
      .select({ walletIndex: wallets.walletIndex })
      .from(wallets)
      .where(eq(wallets.id, walletId))
      .limit(1);

    return wallet?.walletIndex ?? null;
  }
}
