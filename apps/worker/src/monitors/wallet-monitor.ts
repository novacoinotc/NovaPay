import { getDb, wallets, deposits } from "@novapay/db";
import { eq } from "drizzle-orm";
import {
  BlockchainNetwork,
  NETWORK_CONFIG,
  ASSET_CONFIG,
} from "@novapay/shared";
import { tron, ethereum } from "@novapay/crypto";
import { notifyApi } from "../services/api-client";

export class WalletMonitor {
  private tronClient: ReturnType<typeof tron.createTronClient> | null = null;
  private ethProvider: ReturnType<typeof ethereum.createEthereumProvider> | null = null;

  constructor() {
    this.initializeClients();
  }

  private initializeClients() {
    // Inicializar cliente Tron
    if (process.env.TRON_FULL_HOST) {
      this.tronClient = tron.createTronClient({
        fullHost: process.env.TRON_FULL_HOST,
        apiKey: process.env.TRONGRID_API_KEY,
      });
    }

    // Inicializar provider Ethereum
    if (process.env.ETHEREUM_RPC_URL) {
      this.ethProvider = ethereum.createEthereumProvider({
        rpcUrl: process.env.ETHEREUM_RPC_URL,
      });
    }
  }

  /**
   * Verifica todas las wallets activas por nuevos depósitos
   */
  async checkAllWallets(): Promise<void> {
    const db = getDb();

    // Obtener todas las wallets activas
    const activeWallets = await db
      .select()
      .from(wallets)
      .where(eq(wallets.isActive, true));

    console.log(`Checking ${activeWallets.length} active wallets...`);

    for (const wallet of activeWallets) {
      try {
        await this.checkWallet(wallet);
      } catch (error) {
        console.error(`Error checking wallet ${wallet.address}:`, error);
      }
    }
  }

  /**
   * Verifica una wallet específica por nuevos depósitos
   */
  private async checkWallet(wallet: typeof wallets.$inferSelect): Promise<void> {
    switch (wallet.network) {
      case "TRON":
        await this.checkTronWallet(wallet);
        break;
      case "ETHEREUM":
        await this.checkEthereumWallet(wallet);
        break;
      default:
        console.log(`Network ${wallet.network} not yet supported`);
    }
  }

  /**
   * Verifica una wallet Tron (USDT-TRC20)
   */
  private async checkTronWallet(
    wallet: typeof wallets.$inferSelect
  ): Promise<void> {
    if (!this.tronClient) {
      console.warn("Tron client not initialized");
      return;
    }

    const db = getDb();

    // Obtener transacciones recientes
    const transactions = await tron.getTrc20Transactions(
      this.tronClient,
      wallet.address
    );

    // Filtrar transacciones entrantes (donde 'to' es nuestra wallet)
    const incomingTxs = transactions.filter(
      (tx) => tx.to.toLowerCase() === wallet.address.toLowerCase()
    );

    for (const tx of incomingTxs) {
      // Verificar si ya tenemos este depósito registrado
      const existing = await db
        .select()
        .from(deposits)
        .where(eq(deposits.txHash, tx.txHash))
        .limit(1);

      if (existing.length > 0) {
        // Ya existe, verificar si necesita actualización de confirmaciones
        await this.updateConfirmations(existing[0], tx.confirmations);
        continue;
      }

      // Nuevo depósito detectado
      console.log(`New deposit detected: ${tx.txHash}`);
      console.log(`  Amount: ${tx.amount} USDT`);
      console.log(`  Wallet: ${wallet.address}`);

      // Verificar monto mínimo
      const minDeposit = parseFloat(ASSET_CONFIG.USDT_TRC20.minDeposit);
      if (parseFloat(tx.amount) < minDeposit) {
        console.log(`  Skipping: Below minimum deposit (${minDeposit} USDT)`);
        continue;
      }

      // Verificar si ya tiene suficientes confirmaciones
      const requiredConfirmations =
        NETWORK_CONFIG.TRON.requiredConfirmations;
      const alreadyConfirmed = tx.confirmations >= requiredConfirmations;

      // Crear registro de depósito
      const [deposit] = await db
        .insert(deposits)
        .values({
          merchantId: wallet.merchantId,
          walletId: wallet.id,
          txHash: tx.txHash,
          network: "TRON",
          asset: "USDT_TRC20",
          amountCrypto: tx.amount,
          confirmations: tx.confirmations,
          status: alreadyConfirmed ? "CONFIRMED" : "PENDING",
          ...(alreadyConfirmed ? { confirmedAt: new Date() } : {}),
        })
        .returning();

      if (alreadyConfirmed) {
        console.log(`  Already confirmed with ${tx.confirmations} confirmations`);
      }

      // Notificar a la API
      await notifyApi("deposit-detected", {
        depositId: deposit.id,
        walletAddress: wallet.address,
        txHash: tx.txHash,
        network: "TRON",
        asset: "USDT_TRC20",
        amount: tx.amount,
        confirmations: tx.confirmations,
      });

      if (alreadyConfirmed) {
        await notifyApi("deposit-confirmed", {
          depositId: deposit.id,
          txHash: tx.txHash,
          confirmations: tx.confirmations,
        });
      }
    }
  }

  /**
   * Verifica una wallet Ethereum (USDT-ERC20)
   */
  private async checkEthereumWallet(
    wallet: typeof wallets.$inferSelect
  ): Promise<void> {
    if (!this.ethProvider) {
      console.warn("Ethereum provider not initialized");
      return;
    }

    const db = getDb();

    // Obtener transferencias USDT recientes
    const transfers = await ethereum.getUsdtTransfers(
      this.ethProvider,
      wallet.address
    );

    for (const tx of transfers) {
      // Verificar si ya tenemos este depósito registrado
      const existing = await db
        .select()
        .from(deposits)
        .where(eq(deposits.txHash, tx.txHash))
        .limit(1);

      if (existing.length > 0) {
        await this.updateConfirmations(existing[0], tx.confirmations);
        continue;
      }

      // Nuevo depósito detectado
      console.log(`New ERC20 deposit detected: ${tx.txHash}`);

      // Verificar monto mínimo
      const minDeposit = parseFloat(ASSET_CONFIG.USDT_ERC20.minDeposit);
      if (parseFloat(tx.amount) < minDeposit) {
        console.log(`  Skipping: Below minimum deposit (${minDeposit} USDT)`);
        continue;
      }

      // Verificar si ya tiene suficientes confirmaciones
      const requiredConfs =
        NETWORK_CONFIG.ETHEREUM.requiredConfirmations;
      const alreadyConf = tx.confirmations >= requiredConfs;

      // Crear registro de depósito
      const [deposit] = await db
        .insert(deposits)
        .values({
          merchantId: wallet.merchantId,
          walletId: wallet.id,
          txHash: tx.txHash,
          network: "ETHEREUM",
          asset: "USDT_ERC20",
          amountCrypto: tx.amount,
          confirmations: tx.confirmations,
          status: alreadyConf ? "CONFIRMED" : "PENDING",
          ...(alreadyConf ? { confirmedAt: new Date() } : {}),
        })
        .returning();

      if (alreadyConf) {
        console.log(`  Already confirmed with ${tx.confirmations} confirmations`);
      }

      await notifyApi("deposit-detected", {
        depositId: deposit.id,
        walletAddress: wallet.address,
        txHash: tx.txHash,
        network: "ETHEREUM",
        asset: "USDT_ERC20",
        amount: tx.amount,
        confirmations: tx.confirmations,
      });

      if (alreadyConf) {
        await notifyApi("deposit-confirmed", {
          depositId: deposit.id,
          txHash: tx.txHash,
          confirmations: tx.confirmations,
        });
      }
    }
  }

  /**
   * Actualiza las confirmaciones de un depósito
   */
  private async updateConfirmations(
    deposit: typeof deposits.$inferSelect,
    newConfirmations: number
  ): Promise<void> {
    if (deposit.status !== "PENDING") return;
    if (newConfirmations < deposit.confirmations) return;
    // Also check if already has enough confirmations even if count hasn't changed
    const requiredConfs =
      NETWORK_CONFIG[deposit.network as BlockchainNetwork].requiredConfirmations;
    if (newConfirmations === deposit.confirmations && newConfirmations < requiredConfs) return;

    const db = getDb();
    const requiredConfirmations =
      NETWORK_CONFIG[deposit.network as BlockchainNetwork].requiredConfirmations;

    // Actualizar confirmaciones
    await db
      .update(deposits)
      .set({ confirmations: newConfirmations })
      .where(eq(deposits.id, deposit.id));

    // Verificar si ahora está confirmado
    if (newConfirmations >= requiredConfirmations) {
      console.log(`Deposit ${deposit.id} confirmed with ${newConfirmations} confirmations`);

      await db
        .update(deposits)
        .set({
          status: "CONFIRMED",
          confirmedAt: new Date(),
        })
        .where(eq(deposits.id, deposit.id));

      await notifyApi("deposit-confirmed", {
        depositId: deposit.id,
        txHash: deposit.txHash,
        confirmations: newConfirmations,
      });
    }
  }
}
