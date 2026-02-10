import { getDb, wallets, deposits } from "@novapay/db";
import { eq } from "drizzle-orm";
import {
  BlockchainNetwork,
  NETWORK_CONFIG,
  ASSET_CONFIG,
  BUSINESS_RULES,
} from "@novapay/shared";
import { tron, ethereum } from "@novapay/crypto";
import { notifyApi } from "../services/api-client";

export class WalletMonitor {
  private tronClient: ReturnType<typeof tron.createTronClient> | null = null;
  private ethProvider: ReturnType<typeof ethereum.createEthereumProvider> | null = null;
  private lastPollTimestamp: number;

  constructor() {
    this.initializeClients();
    // Start looking back from CONTRACT_EVENTS_LOOKBACK_MS ago
    this.lastPollTimestamp = Date.now() - BUSINESS_RULES.CONTRACT_EVENTS_LOOKBACK_MS;
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
   * Usa contract event monitoring: 1 API call para TRON en vez de N
   */
  async checkAllWallets(): Promise<void> {
    const db = getDb();

    // Obtener todas las wallets activas
    const activeWallets = await db
      .select()
      .from(wallets)
      .where(eq(wallets.isActive, true));

    const tronWallets = activeWallets.filter((w) => w.network === "TRON");
    const ethWallets = activeWallets.filter((w) => w.network === "ETHEREUM");

    console.log(`Checking ${tronWallets.length} TRON + ${ethWallets.length} ETH wallets...`);

    // TRON: Contract event monitoring (1 API call)
    if (this.tronClient && tronWallets.length > 0) {
      await this.checkTronContractEvents(tronWallets);
    }

    // ETH wallets (sin cambios, usan RPC diferente)
    for (const wallet of ethWallets) {
      try {
        await this.checkEthereumWallet(wallet);
      } catch (error) {
        console.error(`Error checking wallet ${wallet.address}:`, error);
      }
    }
  }

  /**
   * Verifica depósitos TRON usando contract events (1 API call)
   */
  private async checkTronContractEvents(
    tronWallets: (typeof wallets.$inferSelect)[]
  ): Promise<void> {
    if (!this.tronClient) return;

    // Build address → wallet lookup map
    const walletMap = new Map<string, typeof wallets.$inferSelect>();
    for (const w of tronWallets) {
      walletMap.set(w.address.toLowerCase(), w);
    }

    const db = getDb();
    const cycleStart = this.lastPollTimestamp;

    try {
      // 1 API call: get all USDT Transfer events since lastPollTimestamp
      const events = await tron.getContractTransferEvents(
        this.tronClient,
        cycleStart
      );

      // Filter: only events where tx.to matches one of our wallets
      let matchCount = 0;
      for (const tx of events) {
        const wallet = walletMap.get(tx.to.toLowerCase());
        if (!wallet) continue;

        matchCount++;

        // Check if deposit already exists
        const existing = await db
          .select()
          .from(deposits)
          .where(eq(deposits.txHash, tx.txHash))
          .limit(1);

        if (existing.length > 0) {
          await this.updateConfirmations(existing[0], tx.confirmations);
          continue;
        }

        // New deposit detected
        console.log(`New deposit detected: ${tx.txHash}`);
        console.log(`  Amount: ${tx.amount} USDT`);
        console.log(`  Wallet: ${wallet.address}`);

        // Check minimum amount
        const minDeposit = parseFloat(ASSET_CONFIG.USDT_TRC20.minDeposit);
        if (parseFloat(tx.amount) < minDeposit) {
          console.log(`  Skipping: Below minimum deposit (${minDeposit} USDT)`);
          continue;
        }

        // Already confirmed (only_confirmed=true in API)
        const alreadyConfirmed = tx.confirmations >= NETWORK_CONFIG.TRON.requiredConfirmations;

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

      if (matchCount > 0) {
        console.log(`Contract events: ${events.length} total, ${matchCount} matched our wallets`);
      }

      // Update lastPollTimestamp on successful cycle
      this.lastPollTimestamp = Date.now();
    } catch (error) {
      console.error("Error in TRON contract event monitoring:", error);
    }
  }

  /**
   * Verifica una wallet Ethereum (USDT-ERC20)
   */
  private async checkEthereumWallet(
    wallet: typeof wallets.$inferSelect
  ): Promise<void> {
    if (!this.ethProvider) {
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
