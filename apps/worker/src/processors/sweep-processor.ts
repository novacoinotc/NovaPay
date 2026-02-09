import { getDb, deposits, wallets, hotWalletTransactions } from "@novapay/db";
import { eq } from "@novapay/db";
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
   * Procesa todos los depósitos confirmados que necesitan sweep
   */
  async processPendingSweeps(): Promise<void> {
    const db = getDb();

    // Obtener depósitos confirmados pendientes de sweep
    const confirmedDeposits = await db
      .select()
      .from(deposits)
      .where(eq(deposits.status, "CONFIRMED"));

    if (confirmedDeposits.length === 0) return;

    console.log(`Processing ${confirmedDeposits.length} pending sweeps...`);

    for (const deposit of confirmedDeposits) {
      try {
        await this.sweepDeposit(deposit);
      } catch (error) {
        console.error(`Error sweeping deposit ${deposit.id}:`, error);
      }
    }
  }

  /**
   * Realiza el sweep de un depósito específico usando HD Wallet
   */
  private async sweepDeposit(
    deposit: typeof deposits.$inferSelect
  ): Promise<void> {
    const db = getDb();

    // Obtener la wallet asociada
    const [wallet] = await db
      .select()
      .from(wallets)
      .where(eq(wallets.id, deposit.walletId));

    if (!wallet) {
      console.error(`Wallet not found for deposit ${deposit.id}`);
      return;
    }

    // Verificar que tenemos el índice de la wallet
    if (wallet.walletIndex === null || wallet.walletIndex === undefined) {
      console.error(`Wallet ${wallet.id} does not have walletIndex (legacy wallet?)`);
      return;
    }

    // Verificar monto mínimo para sweep
    const assetConfig = ASSET_CONFIG[deposit.asset as keyof typeof ASSET_CONFIG];
    const minSweep = parseFloat(assetConfig.minSweep);
    const amount = parseFloat(deposit.amountCrypto);

    if (amount < minSweep) {
      console.log(
        `Deposit ${deposit.id} below minimum sweep (${amount} < ${minSweep})`
      );
      return;
    }

    // Marcar como en proceso de sweep
    await db
      .update(deposits)
      .set({ status: "SWEEPING" })
      .where(eq(deposits.id, deposit.id));

    // Hot wallet destino
    const hotWalletAddress = this.getHotWalletAddress(deposit.network);
    if (!hotWalletAddress) {
      throw new Error(`Hot wallet not configured for ${deposit.network}`);
    }

    let result: { success: boolean; txHash?: string; error?: string };

    // Ejecutar sweep según la red usando HD Wallet + Energy Delegation
    switch (deposit.network) {
      case "TRON":
        result = await this.sweepTronWithHDWallet(
          wallet.walletIndex,
          hotWalletAddress,
          deposit.amountCrypto
        );
        break;

      case "ETHEREUM":
        result = await this.sweepEthWithHDWallet(
          wallet.walletIndex,
          hotWalletAddress,
          deposit.amountCrypto
        );
        break;

      default:
        throw new Error(`Network ${deposit.network} not supported for sweep`);
    }

    if (result.success && result.txHash) {
      console.log(`Sweep successful: ${result.txHash}`);

      // Actualizar depósito
      await db
        .update(deposits)
        .set({
          status: "SWEPT",
          sweepTxHash: result.txHash,
          sweptAt: new Date(),
        })
        .where(eq(deposits.id, deposit.id));

      // Registrar transacción de hot wallet
      await db.insert(hotWalletTransactions).values({
        depositId: deposit.id,
        network: deposit.network,
        asset: deposit.asset,
        txHash: result.txHash,
        direction: "IN",
        amount: deposit.amountCrypto,
      });

      // Notificar a la API
      await notifyApi("deposit-swept", {
        depositId: deposit.id,
        sweepTxHash: result.txHash,
        amountSwept: deposit.amountCrypto,
      });
    } else {
      console.error(`Sweep failed for deposit ${deposit.id}: ${result.error}`);

      // Revertir a CONFIRMED para reintentar
      await db
        .update(deposits)
        .set({ status: "CONFIRMED" })
        .where(eq(deposits.id, deposit.id));
    }
  }

  /**
   * Sweep en Tron usando HD Wallet + Energy Delegation
   * La private key solo existe en memoria durante el sweep
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
      // Derivar private key en memoria (nunca se guarda)
      const derivedWallet = deriveTronWalletWithKey(MASTER_MNEMONIC, walletIndex);
      console.log(`Derived wallet ${walletIndex}: ${derivedWallet.address}`);

      // Usar energy delegation del master wallet
      const result = await tron.sweepWithMasterEnergy(
        this.tronClient,
        MASTER_PRIVATE_KEY,
        derivedWallet.privateKey,
        hotWalletAddress,
        amount
      );

      // La key se garbage collecta al salir del scope
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
      // Derivar private key en memoria
      const derivedWallet = deriveEthWalletWithKey(MASTER_MNEMONIC, walletIndex);
      console.log(`Derived wallet ${walletIndex}: ${derivedWallet.address}`);

      // Ejecutar sweep
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
