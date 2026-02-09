import { getDb, deposits, wallets, hotWalletTransactions } from "@novapay/db";
import { eq, and, sql } from "@novapay/db";
import { ASSET_CONFIG } from "@novapay/shared";
import {
  tron,
  ethereum,
  deriveTronWalletWithKey,
  deriveEthWalletWithKey,
} from "@novapay/crypto";
import { notifyApi } from "../services/api-client";

// Master mnemonic para derivar keys - SOLO EN MEMORIA
const MASTER_MNEMONIC = process.env.HD_WALLET_MNEMONIC!;
const MASTER_PRIVATE_KEY = process.env.HOT_WALLET_PRIVATE_KEY!;

export class SweepProcessor {
  private tronClient: ReturnType<typeof tron.createTronClient> | null = null;
  private ethProvider: ReturnType<typeof ethereum.createEthereumProvider> | null = null;

  constructor() {
    this.initializeClients();
    this.validateConfig();
  }

  private validateConfig() {
    if (!MASTER_MNEMONIC) {
      console.warn("⚠️ HD_WALLET_MNEMONIC not configured - sweeps will fail");
    }
    if (!MASTER_PRIVATE_KEY) {
      console.warn("⚠️ HOT_WALLET_PRIVATE_KEY not configured - energy delegation will fail");
    }
  }

  private initializeClients() {
    if (process.env.TRON_FULL_HOST) {
      this.tronClient = tron.createTronClient({
        fullHost: process.env.TRON_FULL_HOST,
        apiKey: process.env.TRONGRID_API_KEY,
      });
    }

    if (process.env.ETHEREUM_RPC_URL) {
      this.ethProvider = ethereum.createEthereumProvider({
        rpcUrl: process.env.ETHEREUM_RPC_URL,
      });
    }
  }

  /**
   * Procesa sweeps por wallet - barre cuando el balance acumulado supera el mínimo
   * En lugar de barrer cada depósito individual, revisa el balance real de la wallet
   */
  async processPendingSweeps(): Promise<void> {
    const db = getDb();

    // Obtener wallets activas que tienen depósitos CREDITED (ya acreditados, pendientes de sweep)
    const activeWallets = await db
      .select()
      .from(wallets)
      .where(eq(wallets.isActive, true));

    for (const wallet of activeWallets) {
      try {
        await this.checkAndSweepWallet(wallet);
      } catch (error) {
        console.error(`Error processing sweep for wallet ${wallet.address}:`, error);
      }
    }
  }

  /**
   * Verifica el balance real de una wallet y hace sweep si supera el mínimo
   */
  private async checkAndSweepWallet(
    wallet: typeof wallets.$inferSelect
  ): Promise<void> {
    if (wallet.walletIndex === null || wallet.walletIndex === undefined) return;

    const hotWalletAddress = this.getHotWalletAddress(wallet.network);
    if (!hotWalletAddress) return;

    // Obtener balance real de la wallet on-chain
    let balance = "0";
    if (wallet.network === "TRON" && this.tronClient) {
      balance = await tron.getUsdtBalance(this.tronClient, wallet.address);
    } else if (wallet.network === "ETHEREUM" && this.ethProvider) {
      balance = await ethereum.getUsdtBalance(this.ethProvider, wallet.address);
    } else {
      return;
    }

    const balanceNum = parseFloat(balance);
    if (balanceNum <= 0) return;

    // Verificar si el balance supera el mínimo de sweep
    const assetConfig = ASSET_CONFIG[wallet.asset as keyof typeof ASSET_CONFIG];
    const minSweep = parseFloat(assetConfig.minSweep);

    if (balanceNum < minSweep) {
      // No loguear cada 15 segundos, solo cuando hay balance significativo
      if (balanceNum >= 1) {
        console.log(`Wallet ${wallet.address}: ${balance} USDT (accumulating, min sweep: ${minSweep})`);
      }
      return;
    }

    console.log(`Wallet ${wallet.address}: ${balance} USDT >= ${minSweep} minimum, sweeping...`);

    let result: { success: boolean; txHash?: string; error?: string };

    switch (wallet.network) {
      case "TRON":
        result = await this.sweepTronWithHDWallet(
          wallet.walletIndex,
          hotWalletAddress,
          balance // Barrer el balance completo
        );
        break;

      case "ETHEREUM":
        result = await this.sweepEthWithHDWallet(
          wallet.walletIndex,
          hotWalletAddress,
          balance
        );
        break;

      default:
        return;
    }

    if (result.success && result.txHash) {
      console.log(`Sweep successful: ${result.txHash} (${balance} USDT)`);

      const db = getDb();

      // Registrar transacción de hot wallet
      await db.insert(hotWalletTransactions).values({
        network: wallet.network,
        asset: wallet.asset,
        txHash: result.txHash,
        direction: "IN",
        amount: balance,
      });

      // Marcar todos los depósitos CREDITED de esta wallet como SWEPT
      await db
        .update(deposits)
        .set({
          status: "SWEPT",
          sweepTxHash: result.txHash,
          sweptAt: new Date(),
        })
        .where(
          and(
            eq(deposits.walletId, wallet.id),
            eq(deposits.status, "CREDITED")
          )
        );

      // Notificar a la API
      await notifyApi("deposit-swept", {
        walletId: wallet.id,
        sweepTxHash: result.txHash,
        amountSwept: balance,
      });
    } else {
      console.error(`Sweep failed for wallet ${wallet.address}: ${result.error}`);
    }
  }

  /**
   * Sweep en Tron usando HD Wallet + Energy Delegation
   */
  private async sweepTronWithHDWallet(
    walletIndex: number,
    hotWalletAddress: string,
    amount: string
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!this.tronClient) {
      return { success: false, error: "Tron client not initialized" };
    }

    if (!MASTER_MNEMONIC) {
      return { success: false, error: "HD_WALLET_MNEMONIC not configured" };
    }

    if (!MASTER_PRIVATE_KEY) {
      return { success: false, error: "HOT_WALLET_PRIVATE_KEY not configured" };
    }

    try {
      const derivedWallet = deriveTronWalletWithKey(MASTER_MNEMONIC, walletIndex);
      console.log(`Derived wallet ${walletIndex}: ${derivedWallet.address}`);

      const result = await tron.sweepWithMasterEnergy(
        this.tronClient,
        MASTER_PRIVATE_KEY,
        derivedWallet.privateKey,
        hotWalletAddress,
        amount
      );

      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Unknown error during Tron sweep",
      };
    }
  }

  /**
   * Sweep en Ethereum usando HD Wallet
   */
  private async sweepEthWithHDWallet(
    walletIndex: number,
    hotWalletAddress: string,
    amount: string
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!this.ethProvider) {
      return { success: false, error: "Ethereum provider not initialized" };
    }

    if (!MASTER_MNEMONIC) {
      return { success: false, error: "HD_WALLET_MNEMONIC not configured" };
    }

    try {
      const derivedWallet = deriveEthWalletWithKey(MASTER_MNEMONIC, walletIndex);
      console.log(`Derived wallet ${walletIndex}: ${derivedWallet.address}`);

      const result = await ethereum.sweepUsdt(
        this.ethProvider,
        derivedWallet.privateKey,
        hotWalletAddress,
        amount
      );

      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Unknown error during Ethereum sweep",
      };
    }
  }

  /**
   * Obtiene la dirección de la hot wallet según la red
   */
  private getHotWalletAddress(network: string): string | undefined {
    switch (network) {
      case "TRON":
        return process.env.HOT_WALLET_ADDRESS;
      case "ETHEREUM":
        return process.env.HOT_WALLET_ETHEREUM;
      default:
        return undefined;
    }
  }
}
