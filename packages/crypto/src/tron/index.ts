// @ts-expect-error - TronWeb types are incomplete
import TronWeb from "tronweb";
import { ASSET_CONFIG, NETWORK_CONFIG } from "@novapay/shared";
import { fromBaseUnits, toBaseUnits } from "@novapay/shared";

const USDT_CONTRACT = ASSET_CONFIG.USDT_TRC20.contractAddress;
const DECIMALS = ASSET_CONFIG.USDT_TRC20.decimals;

export interface TronConfig {
  fullHost: string;
  apiKey?: string;
}

export interface TronWallet {
  address: string;
  privateKey: string;
}

export interface TronTransaction {
  txHash: string;
  from: string;
  to: string;
  amount: string;
  confirmations: number;
  timestamp: number;
}

/**
 * Crea una instancia de TronWeb
 */
export function createTronClient(config: TronConfig): TronWeb {
  const headers: Record<string, string> = {};
  if (config.apiKey) {
    headers["TRON-PRO-API-KEY"] = config.apiKey;
  }

  return new TronWeb({
    fullHost: config.fullHost,
    headers,
  });
}

/**
 * Genera una nueva wallet Tron
 */
export async function generateTronWallet(
  tronWeb: TronWeb
): Promise<TronWallet> {
  const account = await tronWeb.createAccount();
  return {
    address: account.address.base58,
    privateKey: account.privateKey,
  };
}

/**
 * Obtiene el balance de USDT-TRC20 de una dirección
 */
export async function getUsdtBalance(
  tronWeb: TronWeb,
  address: string
): Promise<string> {
  try {
    tronWeb.setAddress(address);
    const contract = await tronWeb.contract().at(USDT_CONTRACT);
    const balance = await contract.methods.balanceOf(address).call();
    return fromBaseUnits(balance.toString(), DECIMALS);
  } catch (error) {
    console.error("Error getting USDT balance:", error);
    return "0";
  }
}

/**
 * Obtiene el balance de TRX (para fees)
 */
export async function getTrxBalance(
  tronWeb: TronWeb,
  address: string
): Promise<string> {
  try {
    const balance = await tronWeb.trx.getBalance(address);
    return fromBaseUnits(balance.toString(), 6); // TRX tiene 6 decimales
  } catch (error) {
    console.error("Error getting TRX balance:", error);
    return "0";
  }
}

/**
 * Obtiene el número de bloque actual (para cachear entre llamadas)
 */
export async function getCurrentBlockNumber(tronWeb: TronWeb): Promise<number> {
  try {
    const currentBlock = await tronWeb.trx.getCurrentBlock();
    return currentBlock?.block_header?.raw_data?.number || 0;
  } catch (error) {
    console.error("Error getting current block:", error);
    return 0;
  }
}

/**
 * Obtiene transacciones TRC20 recientes de una dirección
 * @param cachedBlockNumber - Número de bloque pre-cacheado para evitar llamadas extra
 */
export async function getTrc20Transactions(
  tronWeb: TronWeb,
  address: string,
  limit: number = 50,
  cachedBlockNumber?: number
): Promise<TronTransaction[]> {
  try {
    const url = `${tronWeb.fullNode.host}/v1/accounts/${address}/transactions/trc20?limit=${limit}&contract_address=${USDT_CONTRACT}`;

    // Include API key header if available
    const headers: Record<string, string> = {};
    const apiKey = (tronWeb as any).headers?.["TRON-PRO-API-KEY"];
    if (apiKey) {
      headers["TRON-PRO-API-KEY"] = apiKey;
    }

    // Retry con backoff en caso de 429
    let response: Response | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      response = await fetch(url, { headers });

      if (response.status === 429) {
        const waitMs = 2000 * (attempt + 1);
        console.warn(`TronGrid 429 for ${address.slice(0, 10)}... retry in ${waitMs}ms (attempt ${attempt + 1}/3)`);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      break;
    }

    if (!response || !response.ok) {
      console.error(`TronGrid API error: HTTP ${response?.status} for ${address}`);
      return [];
    }

    const data = (await response.json()) as { data?: Array<Record<string, any>> };

    if (!data.data || !Array.isArray(data.data)) {
      return [];
    }

    if (data.data.length > 0) {
      console.log(`TronGrid: ${data.data.length} TRC20 txs for ${address.slice(0, 10)}...`);
    }

    // Usar bloque cacheado o obtener uno nuevo
    const currentBlockNumber = cachedBlockNumber ?? await getCurrentBlockNumber(tronWeb);

    return data.data.map((tx: any) => {
      // Calcular confirmaciones basado en la diferencia de bloques
      let confirmations = 0;
      if (tx.block_timestamp && tx.block_number) {
        confirmations = Math.max(0, currentBlockNumber - tx.block_number);
      } else if (tx.block_timestamp) {
        // Si no tenemos block_number pero sí timestamp, asumimos confirmado
        confirmations = NETWORK_CONFIG.TRON.requiredConfirmations;
      }

      return {
        txHash: tx.transaction_id,
        from: tx.from,
        to: tx.to,
        amount: fromBaseUnits(tx.value, DECIMALS),
        confirmations,
        timestamp: tx.block_timestamp,
      };
    });
  } catch (error) {
    console.error(`Error getting TRC20 transactions for ${address}:`, error);
    return [];
  }
}

/**
 * Verifica si una transacción está confirmada
 */
export async function isTransactionConfirmed(
  tronWeb: TronWeb,
  txHash: string,
  requiredConfirmations: number = NETWORK_CONFIG.TRON.requiredConfirmations
): Promise<{ confirmed: boolean; confirmations: number }> {
  try {
    const tx = await tronWeb.trx.getTransactionInfo(txHash);

    if (!tx || !tx.blockNumber) {
      return { confirmed: false, confirmations: 0 };
    }

    const currentBlock = await tronWeb.trx.getCurrentBlock();
    const confirmations = currentBlock.block_header.raw_data.number - tx.blockNumber;

    return {
      confirmed: confirmations >= requiredConfirmations,
      confirmations: Math.max(0, confirmations),
    };
  } catch (error) {
    console.error("Error checking transaction confirmation:", error);
    return { confirmed: false, confirmations: 0 };
  }
}

/**
 * Envía USDT-TRC20 desde una wallet a otra (sweep)
 */
export async function sweepUsdt(
  tronWeb: TronWeb,
  fromPrivateKey: string,
  toAddress: string,
  amount: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    // Configurar la wallet origen
    tronWeb.setPrivateKey(fromPrivateKey);
    const fromAddress = tronWeb.address.fromPrivateKey(fromPrivateKey);

    // Verificar balance
    const balance = await getUsdtBalance(tronWeb, fromAddress);
    if (parseFloat(balance) < parseFloat(amount)) {
      return { success: false, error: "Insufficient USDT balance" };
    }

    // Verificar TRX para fees
    const trxBalance = await getTrxBalance(tronWeb, fromAddress);
    if (parseFloat(trxBalance) < 10) {
      // ~10 TRX para fees
      return { success: false, error: "Insufficient TRX for fees" };
    }

    // Preparar transacción
    const contract = await tronWeb.contract().at(USDT_CONTRACT);
    const amountInBaseUnits = toBaseUnits(amount, DECIMALS);

    // Enviar
    const tx = await contract.methods
      .transfer(toAddress, amountInBaseUnits.toString())
      .send({
        feeLimit: 100_000_000, // 100 TRX máximo
        shouldPollResponse: true,
      });

    return {
      success: true,
      txHash: tx,
    };
  } catch (error: any) {
    console.error("Error sweeping USDT:", error);
    return {
      success: false,
      error: error.message || "Unknown error during sweep",
    };
  }
}

/**
 * Verifica si una dirección es válida en Tron
 */
export function isValidTronAddress(address: string): boolean {
  return TronWeb.isAddress(address);
}

// Re-export energy manager
export * from "./energy-manager";
