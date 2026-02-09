import { getDb, deposits, wallets, hotWalletTransactions } from "@novapay/db";
import { eq } from "drizzle-orm";
import { ASSET_CONFIG } from "@novapay/shared";
import { tron, ethereum, decryptPrivateKey } from "@novapay/crypto";
import { notifyApi } from "../services/api-client";

export class SweepProcessor {
  private tronClient: ReturnType<typeof tron.createTronClient> | null = null;
  private ethProvider: ReturnType<typeof ethereum.createEthereumProvider> | null = null;

  constructor() {
    this.initializeClients();
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
   * Realiza el sweep de un depósito específico
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

    // Desencriptar private key
    const masterPassword = process.env.ENCRYPTION_MASTER_PASSWORD;
    if (!masterPassword) {
      throw new Error("ENCRYPTION_MASTER_PASSWORD not set");
    }

    const privateKey = await decryptPrivateKey(
      wallet.encryptedPrivateKey,
      masterPassword
    );

    // Hot wallet destino
    const hotWalletAddress = this.getHotWalletAddress(deposit.network);
    if (!hotWalletAddress) {
      throw new Error(`Hot wallet not configured for ${deposit.network}`);
    }

    let result: { success: boolean; txHash?: string; error?: string };

    // Ejecutar sweep según la red
    switch (deposit.network) {
      case "TRON":
        if (!this.tronClient) throw new Error("Tron client not initialized");
        result = await tron.sweepUsdt(
          this.tronClient,
          privateKey,
          hotWalletAddress,
          deposit.amountCrypto
        );
        break;

      case "ETHEREUM":
        if (!this.ethProvider) throw new Error("Ethereum provider not initialized");
        result = await ethereum.sweepUsdt(
          this.ethProvider,
          privateKey,
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
   * Obtiene la dirección de la hot wallet según la red
   */
  private getHotWalletAddress(network: string): string | undefined {
    switch (network) {
      case "TRON":
        return process.env.HOT_WALLET_TRON;
      case "ETHEREUM":
        return process.env.HOT_WALLET_ETHEREUM;
      default:
        return undefined;
    }
  }
}
