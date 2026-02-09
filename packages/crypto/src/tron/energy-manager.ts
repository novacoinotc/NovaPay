/**
 * Tron Energy Manager
 *
 * Gestiona el staking de TRX y delegación de energía
 * para que la wallet maestra pague todos los fees
 */

// @ts-expect-error - TronWeb types are incomplete
import TronWeb from "tronweb";
import { ASSET_CONFIG } from "@novapay/shared";

const USDT_CONTRACT = ASSET_CONFIG.USDT_TRC20.contractAddress;

// Energía necesaria aproximada para una transferencia TRC20
const ENERGY_FOR_TRC20_TRANSFER = 65000;

// Bandwidth necesario aproximado
const BANDWIDTH_FOR_TRANSFER = 350;

export interface EnergyInfo {
  totalEnergy: number;
  usedEnergy: number;
  availableEnergy: number;
  stakedTrx: number;
}

export interface ResourceInfo {
  energy: EnergyInfo;
  bandwidth: {
    total: number;
    used: number;
    available: number;
  };
  trxBalance: number;
}

/**
 * Obtiene información de recursos de una cuenta
 */
export async function getAccountResources(
  tronWeb: TronWeb,
  address: string
): Promise<ResourceInfo> {
  try {
    const resources = await tronWeb.trx.getAccountResources(address);
    const account = await tronWeb.trx.getAccount(address);

    return {
      energy: {
        totalEnergy: resources.EnergyLimit || 0,
        usedEnergy: resources.EnergyUsed || 0,
        availableEnergy: (resources.EnergyLimit || 0) - (resources.EnergyUsed || 0),
        stakedTrx: (account.account_resource?.frozen_balance_for_energy?.frozen_balance || 0) / 1_000_000,
      },
      bandwidth: {
        total: resources.freeNetLimit || 0,
        used: resources.freeNetUsed || 0,
        available: (resources.freeNetLimit || 0) - (resources.freeNetUsed || 0),
      },
      trxBalance: (account.balance || 0) / 1_000_000,
    };
  } catch (error) {
    console.error("Error getting account resources:", error);
    throw error;
  }
}

/**
 * Verifica si la wallet maestra tiene suficientes recursos
 */
export async function hasEnoughResources(
  tronWeb: TronWeb,
  masterAddress: string
): Promise<{ hasEnergy: boolean; hasBandwidth: boolean; hasTrx: boolean }> {
  const resources = await getAccountResources(tronWeb, masterAddress);

  return {
    hasEnergy: resources.energy.availableEnergy >= ENERGY_FOR_TRC20_TRANSFER,
    hasBandwidth: resources.bandwidth.available >= BANDWIDTH_FOR_TRANSFER,
    hasTrx: resources.trxBalance >= 10, // Mínimo 10 TRX como respaldo
  };
}

/**
 * Stakea TRX para obtener energía (Stake 2.0)
 */
export async function stakeTrxForEnergy(
  tronWeb: TronWeb,
  privateKey: string,
  amountTrx: number
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    tronWeb.setPrivateKey(privateKey);
    const address = tronWeb.address.fromPrivateKey(privateKey);

    const amountSun = amountTrx * 1_000_000; // Convertir a Sun

    // Stake 2.0 - freezeBalanceV2
    const tx = await tronWeb.transactionBuilder.freezeBalanceV2(
      amountSun,
      "ENERGY",
      address
    );

    const signedTx = await tronWeb.trx.sign(tx, privateKey);
    const result = await tronWeb.trx.sendRawTransaction(signedTx);

    return {
      success: result.result === true,
      txHash: result.txid,
    };
  } catch (error: any) {
    console.error("Error staking TRX:", error);
    return {
      success: false,
      error: error.message || "Failed to stake TRX",
    };
  }
}

/**
 * Delega energía a otra dirección
 */
export async function delegateEnergy(
  tronWeb: TronWeb,
  masterPrivateKey: string,
  toAddress: string,
  energyAmount: number = ENERGY_FOR_TRC20_TRANSFER
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    tronWeb.setPrivateKey(masterPrivateKey);
    const masterAddress = tronWeb.address.fromPrivateKey(masterPrivateKey);

    // Delegar energía usando delegateResource (Stake 2.0)
    const tx = await tronWeb.transactionBuilder.delegateResource(
      energyAmount,
      toAddress,
      "ENERGY",
      masterAddress,
      false // lock = false, no bloquear
    );

    const signedTx = await tronWeb.trx.sign(tx, masterPrivateKey);
    const result = await tronWeb.trx.sendRawTransaction(signedTx);

    return {
      success: result.result === true,
      txHash: result.txid,
    };
  } catch (error: any) {
    console.error("Error delegating energy:", error);
    return {
      success: false,
      error: error.message || "Failed to delegate energy",
    };
  }
}

/**
 * Recupera energía delegada
 */
export async function undelegateEnergy(
  tronWeb: TronWeb,
  masterPrivateKey: string,
  fromAddress: string,
  energyAmount: number = ENERGY_FOR_TRC20_TRANSFER
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    tronWeb.setPrivateKey(masterPrivateKey);
    const masterAddress = tronWeb.address.fromPrivateKey(masterPrivateKey);

    const tx = await tronWeb.transactionBuilder.undelegateResource(
      energyAmount,
      fromAddress,
      "ENERGY",
      masterAddress
    );

    const signedTx = await tronWeb.trx.sign(tx, masterPrivateKey);
    const result = await tronWeb.trx.sendRawTransaction(signedTx);

    return {
      success: result.result === true,
      txHash: result.txid,
    };
  } catch (error: any) {
    console.error("Error undelegating energy:", error);
    return {
      success: false,
      error: error.message || "Failed to undelegate energy",
    };
  }
}

/**
 * Envía TRX desde la master wallet a una dirección
 * Usado como fallback cuando no hay suficiente energía para delegar
 */
async function sendTrxForFees(
  tronWeb: TronWeb,
  masterPrivateKey: string,
  toAddress: string,
  amountTrx: number
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    tronWeb.setPrivateKey(masterPrivateKey);
    const amountSun = Math.floor(amountTrx * 1_000_000);

    const tx = await tronWeb.trx.sendTransaction(toAddress, amountSun);

    if (tx.result) {
      console.log(`Sent ${amountTrx} TRX to ${toAddress} for fees: ${tx.txid}`);
      return { success: true, txHash: tx.txid };
    }
    return { success: false, error: "TRX send failed" };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to send TRX" };
  }
}

/**
 * Sweep USDT usando la energía de la wallet maestra
 * Fallback: si no hay suficiente energía, envía TRX para cubrir fees
 */
export async function sweepWithMasterEnergy(
  tronWeb: TronWeb,
  masterPrivateKey: string,
  merchantPrivateKey: string,
  toAddress: string,
  amount: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  const merchantAddress = tronWeb.address.fromPrivateKey(merchantPrivateKey);

  try {
    const masterAddress = tronWeb.address.fromPrivateKey(masterPrivateKey);
    const resources = await hasEnoughResources(tronWeb, masterAddress);

    let usedEnergyDelegation = false;

    if (resources.hasEnergy) {
      // Opción A: Delegar energía (gratis, usa staking)
      console.log(`Delegating energy to ${merchantAddress}...`);
      const delegateResult = await delegateEnergy(
        tronWeb,
        masterPrivateKey,
        merchantAddress,
        ENERGY_FOR_TRC20_TRANSFER * 2
      );

      if (delegateResult.success) {
        usedEnergyDelegation = true;
        // Esperar para que la delegación se propague
        await new Promise(resolve => setTimeout(resolve, 3000));
      } else {
        console.warn("Energy delegation failed:", delegateResult.error);
      }
    }

    if (!usedEnergyDelegation) {
      // Opción B: Enviar TRX para cubrir fees directamente
      // Verificar si la wallet ya tiene TRX suficiente (de intentos anteriores)
      const existingTrx = await tronWeb.trx.getBalance(merchantAddress);
      const existingTrxAmount = existingTrx / 1_000_000;

      if (existingTrxAmount < 15) {
        console.log(`Insufficient energy, sending TRX to ${merchantAddress} for fees (has ${existingTrxAmount.toFixed(1)} TRX)...`);
        const trxResult = await sendTrxForFees(tronWeb, masterPrivateKey, merchantAddress, 30);
        if (!trxResult.success) {
          return { success: false, error: `Failed to fund fees: ${trxResult.error}` };
        }
        // Esperar a que la TX de TRX se confirme
        await new Promise(resolve => setTimeout(resolve, 4000));
      } else {
        console.log(`Wallet ${merchantAddress} already has ${existingTrxAmount.toFixed(1)} TRX, skipping funding`);
      }
    }

    // Ejecutar el sweep
    console.log(`Sweeping ${amount} USDT from ${merchantAddress} to ${toAddress}...`);
    tronWeb.setPrivateKey(merchantPrivateKey);

    const contract = await tronWeb.contract().at(USDT_CONTRACT);
    const amountInBaseUnits = BigInt(Math.floor(parseFloat(amount) * 1_000_000));

    // shouldPollResponse: false para obtener el txHash inmediatamente
    // sin esperar confirmación (evita timeout que retorna false)
    const txResult = await contract.methods
      .transfer(toAddress, amountInBaseUnits.toString())
      .send({
        feeLimit: 100_000_000, // 100 TRX máximo
        shouldPollResponse: false,
      });

    // TronWeb puede devolver string (txHash) u objeto con txid
    const txHash = typeof txResult === "string" ? txResult : txResult?.txid || txResult?.transaction?.txID;

    if (!txHash) {
      console.error("Sweep returned unexpected result:", txResult);
      return { success: false, error: "No transaction hash returned" };
    }

    console.log(`Sweep successful: ${txHash}`);

    // Recuperar energía delegada en background
    if (usedEnergyDelegation) {
      setTimeout(async () => {
        try {
          await undelegateEnergy(tronWeb, masterPrivateKey, merchantAddress, ENERGY_FOR_TRC20_TRANSFER * 2);
          console.log(`Energy undelegated from ${merchantAddress}`);
        } catch (err) {
          console.warn("Failed to undelegate energy (will recover naturally):", err);
        }
      }, 5000);
    }

    return {
      success: true,
      txHash,
    };
  } catch (error: any) {
    console.error("Error in sweepWithMasterEnergy:", error);

    // Intentar recuperar energía de todas formas
    try {
      await undelegateEnergy(tronWeb, masterPrivateKey, merchantAddress, ENERGY_FOR_TRC20_TRANSFER * 2);
    } catch { }

    return {
      success: false,
      error: error.message || "Unknown error during sweep",
    };
  }
}

/**
 * Calcula cuánto TRX necesitas stakear para un número de sweeps diarios
 */
export function calculateStakingRequirement(sweepsPerDay: number): {
  trxNeeded: number;
  energyPerDay: number;
} {
  // Energía se regenera completamente en 24 horas
  // Cada sweep necesita ~65,000 energía
  const energyPerDay = sweepsPerDay * ENERGY_FOR_TRC20_TRANSFER;

  // Aproximadamente 1 TRX stakeado = 50-100 energía/día
  // Siendo conservadores, usamos 50
  const energyPerTrxPerDay = 50;
  const trxNeeded = Math.ceil(energyPerDay / energyPerTrxPerDay);

  return {
    trxNeeded,
    energyPerDay,
  };
}
