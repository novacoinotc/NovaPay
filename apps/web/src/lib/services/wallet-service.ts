import { getDb, wallets, WalletInsert } from "@novapay/db";
import { eq, and } from "@novapay/db";
import {
  tron,
  ethereum,
  encryptPrivateKey,
} from "@novapay/crypto";
import { CryptoAsset, BlockchainNetwork, ASSET_CONFIG } from "@novapay/shared";

const MASTER_PASSWORD = process.env.ENCRYPTION_MASTER_PASSWORD!;

export class WalletService {
  /**
   * Genera todas las wallets para un comercio nuevo
   */
  static async generateWalletsForMerchant(merchantId: string): Promise<void> {
    const db = getDb();

    // Generar wallet USDT-TRC20 (Tron)
    await this.generateWallet(merchantId, "USDT_TRC20", "TRON");

    // Generar wallet USDT-ERC20 (Ethereum)
    await this.generateWallet(merchantId, "USDT_ERC20", "ETHEREUM");

    // Nota: BTC requiere implementación adicional
  }

  /**
   * Genera una wallet específica para un comercio
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

    let address: string;
    let privateKey: string;

    // Generar wallet según la red
    switch (network) {
      case "TRON": {
        const tronClient = tron.createTronClient({
          fullHost: process.env.TRON_FULL_HOST || "https://api.trongrid.io",
          apiKey: process.env.TRONGRID_API_KEY,
        });
        const wallet = await tron.generateTronWallet(tronClient);
        address = wallet.address;
        privateKey = wallet.privateKey;
        break;
      }

      case "ETHEREUM": {
        const wallet = ethereum.generateEthereumWallet();
        address = wallet.address;
        privateKey = wallet.privateKey;
        break;
      }

      default:
        throw new Error(`Network ${network} not supported for wallet generation`);
    }

    // Encriptar la clave privada
    const encryptedPrivateKey = await encryptPrivateKey(privateKey, MASTER_PASSWORD);

    // Guardar en la base de datos
    await db.insert(wallets).values({
      merchantId,
      network,
      asset,
      address,
      encryptedPrivateKey,
      isActive: true,
    });

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
}
