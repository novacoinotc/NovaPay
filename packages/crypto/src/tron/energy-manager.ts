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
 * Sweep USDT usando la energía de la wallet maestra
 * Este método deriva la key del comercio, delega energía, hace sweep, recupera energía
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
    // 1. Verificar que la wallet maestra tiene energía
    const masterAddress = tronWeb.address.fromPrivateKey(masterPrivateKey);
    const resources = await hasEnoughResources(tronWeb, masterAddress);

    if (!resources.hasEnergy) {
      return { success: false, error: "Master wallet has insufficient energy" };
    }

    // 2. Delegar energía a la wallet del comercio
    console.log(`Delegating energy to ${merchantAddress}...`);
    const delegateResult = await delegateEnergy(
      tronWeb,
      masterPrivateKey,
      merchantAddress,
      ENERGY_FOR_TRC20_TRANSFER * 2 // Delegamos el doble por seguridad
    );

    if (!delegateResult.success) {
      // Si falla la delegación, intentamos el sweep de todas formas
      // (la wallet del comercio podría tener energía propia)
      console.warn("Energy delegation failed, attempting sweep anyway:", delegateResult.error);
    }

    // 3. Esperar un momento para que la delegación se propague
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 4. Ejecutar el sweep
    console.log(`Sweeping ${amount} USDT from ${merchantAddress} to ${toAddress}...`);
    tronWeb.setPrivateKey(merchantPrivateKey);

    const contract = await tronWeb.contract().at(USDT_CONTRACT);

    // Convertir amount a base units (6 decimales para USDT)
    const amountInBaseUnits = BigInt(Math.floor(parseFloat(amount) * 1_000_000));

    const tx = await contract.methods
      .transfer(toAddress, amountInBaseUnits.toString())
      .send({
        feeLimit: 50_000_000, // 50 TRX máximo (solo como respaldo)
        shouldPollResponse: true,
      });

    console.log(`Sweep successful: ${tx}`);

    // 5. Recuperar la energía delegada (en background, no bloqueamos)
    setTimeout(async () => {
      try {
        await undelegateEnergy(tronWeb, masterPrivateKey, merchantAddress, ENERGY_FOR_TRC20_TRANSFER * 2);
        console.log(`Energy undelegated from ${merchantAddress}`);
      } catch (err) {
        console.warn("Failed to undelegate energy (will recover naturally):", err);
      }
    }, 5000);

    return {
      success: true,
      txHash: tx,
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
