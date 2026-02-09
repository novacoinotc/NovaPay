import {
  JsonRpcProvider,
  Wallet,
  Contract,
  formatUnits,
  parseUnits,
  isAddress,
} from "ethers";
import { ASSET_CONFIG, NETWORK_CONFIG } from "@novapay/shared";

const USDT_CONTRACT = ASSET_CONFIG.USDT_ERC20.contractAddress;
const DECIMALS = ASSET_CONFIG.USDT_ERC20.decimals;

// ABI mínimo para ERC20
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
];

export interface EthereumConfig {
  rpcUrl: string;
  chainId?: number;
}

export interface EthereumWallet {
  address: string;
  privateKey: string;
}

export interface EthereumTransaction {
  txHash: string;
  from: string;
  to: string;
  amount: string;
  confirmations: number;
  timestamp?: number;
}

/**
 * Crea un provider de Ethereum
 */
export function createEthereumProvider(config: EthereumConfig): JsonRpcProvider {
  return new JsonRpcProvider(config.rpcUrl, config.chainId);
}

/**
 * Genera una nueva wallet Ethereum
 */
export function generateEthereumWallet(): EthereumWallet {
  const wallet = Wallet.createRandom();
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
  };
}

/**
 * Crea una instancia de wallet conectada al provider
 */
export function connectWallet(
  privateKey: string,
  provider: JsonRpcProvider
): Wallet {
  return new Wallet(privateKey, provider);
}

/**
 * Obtiene el balance de USDT-ERC20 de una dirección
 */
export async function getUsdtBalance(
  provider: JsonRpcProvider,
  address: string
): Promise<string> {
  try {
    const contract = new Contract(USDT_CONTRACT, ERC20_ABI, provider);
    const balance = await contract.balanceOf(address);
    return formatUnits(balance, DECIMALS);
  } catch (error) {
    console.error("Error getting USDT balance:", error);
    return "0";
  }
}

/**
 * Obtiene el balance de ETH (para gas)
 */
export async function getEthBalance(
  provider: JsonRpcProvider,
  address: string
): Promise<string> {
  try {
    const balance = await provider.getBalance(address);
    return formatUnits(balance, 18);
  } catch (error) {
    console.error("Error getting ETH balance:", error);
    return "0";
  }
}

/**
 * Obtiene las transacciones USDT recientes de una dirección usando eventos Transfer
 */
export async function getUsdtTransfers(
  provider: JsonRpcProvider,
  address: string,
  fromBlock: number = -10000 // últimos ~10k bloques
): Promise<EthereumTransaction[]> {
  try {
    const contract = new Contract(USDT_CONTRACT, ERC20_ABI, provider);
    const currentBlock = await provider.getBlockNumber();
    const startBlock = Math.max(0, currentBlock + fromBlock);

    // Filtrar eventos Transfer donde 'to' es nuestra dirección
    const filter = contract.filters.Transfer(null, address);
    const events = await contract.queryFilter(filter, startBlock, currentBlock);

    const transactions: EthereumTransaction[] = [];

    for (const event of events) {
      const tx = await event.getTransaction();
      const receipt = await tx.wait();

      transactions.push({
        txHash: event.transactionHash,
        from: (event as any).args[0],
        to: (event as any).args[1],
        amount: formatUnits((event as any).args[2], DECIMALS),
        confirmations: currentBlock - event.blockNumber,
      });
    }

    return transactions;
  } catch (error) {
    console.error("Error getting USDT transfers:", error);
    return [];
  }
}

/**
 * Verifica si una transacción está confirmada
 */
export async function isTransactionConfirmed(
  provider: JsonRpcProvider,
  txHash: string,
  requiredConfirmations: number = NETWORK_CONFIG.ETHEREUM.requiredConfirmations
): Promise<{ confirmed: boolean; confirmations: number }> {
  try {
    const receipt = await provider.getTransactionReceipt(txHash);

    if (!receipt || !receipt.blockNumber) {
      return { confirmed: false, confirmations: 0 };
    }

    const currentBlock = await provider.getBlockNumber();
    const confirmations = currentBlock - receipt.blockNumber;

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
 * Envía USDT-ERC20 desde una wallet a otra (sweep)
 */
export async function sweepUsdt(
  provider: JsonRpcProvider,
  fromPrivateKey: string,
  toAddress: string,
  amount: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const wallet = connectWallet(fromPrivateKey, provider);
    const fromAddress = wallet.address;

    // Verificar balance USDT
    const balance = await getUsdtBalance(provider, fromAddress);
    if (parseFloat(balance) < parseFloat(amount)) {
      return { success: false, error: "Insufficient USDT balance" };
    }

    // Verificar ETH para gas
    const ethBalance = await getEthBalance(provider, fromAddress);
    if (parseFloat(ethBalance) < 0.005) {
      // ~0.005 ETH para gas
      return { success: false, error: "Insufficient ETH for gas" };
    }

    // Preparar contrato con signer
    const contract = new Contract(USDT_CONTRACT, ERC20_ABI, wallet);
    const amountInBaseUnits = parseUnits(amount, DECIMALS);

    // Enviar transacción
    const tx = await contract.transfer(toAddress, amountInBaseUnits);
    const receipt = await tx.wait();

    return {
      success: true,
      txHash: receipt.hash,
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
 * Verifica si una dirección es válida en Ethereum
 */
export function isValidEthereumAddress(address: string): boolean {
  return isAddress(address);
}

/**
 * Estima el gas necesario para una transferencia USDT
 */
export async function estimateGas(
  provider: JsonRpcProvider,
  fromAddress: string,
  toAddress: string,
  amount: string
): Promise<{ gasLimit: bigint; gasPrice: bigint; totalCost: string }> {
  const contract = new Contract(USDT_CONTRACT, ERC20_ABI, provider);
  const amountInBaseUnits = parseUnits(amount, DECIMALS);

  const gasLimit = await contract.transfer.estimateGas(toAddress, amountInBaseUnits, {
    from: fromAddress,
  });

  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || BigInt(0);

  const totalCost = formatUnits(gasLimit * gasPrice, 18);

  return {
    gasLimit,
    gasPrice,
    totalCost,
  };
}
