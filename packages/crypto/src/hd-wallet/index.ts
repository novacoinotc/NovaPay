/**
 * HD Wallet (Hierarchical Deterministic) Module
 *
 * Implementación estilo Binance:
 * - Una semilla maestra genera infinitas wallets
 * - Sin almacenar private keys en base de datos
 * - Solo necesitas: master_seed + wallet_index = private_key
 */

import * as bip39 from "bip39";
import { HDKey } from "@scure/bip32";
import { createHash } from "crypto";
// @ts-expect-error - TronWeb types are incomplete
import TronWeb from "tronweb";

// BIP44 paths
// Tron: m/44'/195'/0'/0/index
// Ethereum: m/44'/60'/0'/0/index
const TRON_PATH = "m/44'/195'/0'/0";
const ETH_PATH = "m/44'/60'/0'/0";

export interface HDWalletConfig {
  mnemonic: string; // 24 palabras BIP39
}

export interface DerivedWallet {
  address: string;
  index: number;
  path: string;
}

export interface DerivedWalletWithKey extends DerivedWallet {
  privateKey: string;
}

/**
 * Genera una nueva semilla maestra (24 palabras)
 * ⚠️ GUARDAR EN LUGAR SEGURO - OFFLINE
 */
export function generateMasterSeed(): string {
  return bip39.generateMnemonic(256); // 24 palabras = 256 bits
}

/**
 * Valida una semilla mnemónica
 */
export function validateMnemonic(mnemonic: string): boolean {
  return bip39.validateMnemonic(mnemonic);
}

/**
 * Crea un HD Wallet master desde un mnemonic
 */
export function createHDWallet(mnemonic: string): HDKey {
  if (!validateMnemonic(mnemonic)) {
    throw new Error("Invalid mnemonic");
  }
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  return HDKey.fromMasterSeed(seed);
}

/**
 * Deriva una wallet Tron desde el índice
 * Retorna SOLO la dirección (sin private key) - para almacenar en DB
 */
export function deriveTronAddress(mnemonic: string, index: number): DerivedWallet {
  const hdWallet = createHDWallet(mnemonic);
  const path = `${TRON_PATH}/${index}`;
  const child = hdWallet.derive(path);

  if (!child.privateKey) {
    throw new Error("Failed to derive private key");
  }

  // Convertir a dirección Tron
  const privateKeyHex = Buffer.from(child.privateKey).toString("hex");
  const address = TronWeb.address.fromPrivateKey(privateKeyHex);

  return {
    address,
    index,
    path,
  };
}

/**
 * Deriva una wallet Tron CON private key
 * ⚠️ Solo usar cuando necesites firmar transacciones (sweep)
 * ⚠️ La key debe existir solo en memoria, nunca persistir
 */
export function deriveTronWalletWithKey(mnemonic: string, index: number): DerivedWalletWithKey {
  const hdWallet = createHDWallet(mnemonic);
  const path = `${TRON_PATH}/${index}`;
  const child = hdWallet.derive(path);

  if (!child.privateKey) {
    throw new Error("Failed to derive private key");
  }

  const privateKeyHex = Buffer.from(child.privateKey).toString("hex");
  const address = TronWeb.address.fromPrivateKey(privateKeyHex);

  return {
    address,
    index,
    path,
    privateKey: privateKeyHex,
  };
}

/**
 * Deriva múltiples direcciones (útil para pre-generar)
 */
export function deriveTronAddresses(
  mnemonic: string,
  startIndex: number,
  count: number
): DerivedWallet[] {
  const addresses: DerivedWallet[] = [];
  for (let i = startIndex; i < startIndex + count; i++) {
    addresses.push(deriveTronAddress(mnemonic, i));
  }
  return addresses;
}

/**
 * Deriva una wallet Ethereum desde el índice
 */
export function deriveEthAddress(mnemonic: string, index: number): DerivedWallet {
  const hdWallet = createHDWallet(mnemonic);
  const path = `${ETH_PATH}/${index}`;
  const child = hdWallet.derive(path);

  if (!child.privateKey) {
    throw new Error("Failed to derive private key");
  }

  // Para Ethereum usamos ethers
  const privateKeyHex = Buffer.from(child.privateKey).toString("hex");
  // Importar ethers dinámicamente
  const { ethers } = require("ethers");
  const wallet = new ethers.Wallet("0x" + privateKeyHex);

  return {
    address: wallet.address,
    index,
    path,
  };
}

/**
 * Deriva wallet Ethereum CON private key
 */
export function deriveEthWalletWithKey(mnemonic: string, index: number): DerivedWalletWithKey {
  const hdWallet = createHDWallet(mnemonic);
  const path = `${ETH_PATH}/${index}`;
  const child = hdWallet.derive(path);

  if (!child.privateKey) {
    throw new Error("Failed to derive private key");
  }

  const privateKeyHex = Buffer.from(child.privateKey).toString("hex");
  const { ethers } = require("ethers");
  const wallet = new ethers.Wallet("0x" + privateKeyHex);

  return {
    address: wallet.address,
    index,
    path,
    privateKey: privateKeyHex,
  };
}

/**
 * Genera un índice único para un comercio basado en su ID
 * Esto asegura que el mismo merchantId siempre genere el mismo índice
 */
export function merchantIdToWalletIndex(merchantId: string): number {
  const hash = createHash("sha256").update(merchantId).digest();
  // Usar los primeros 4 bytes para generar un índice
  // Esto da un rango de 0 a 4,294,967,295 (más que suficiente)
  return hash.readUInt32LE(0);
}

/**
 * Verifica que una dirección corresponda al índice esperado
 * Útil para auditoría
 */
export function verifyAddressDerivation(
  mnemonic: string,
  expectedAddress: string,
  index: number,
  network: "tron" | "ethereum"
): boolean {
  const derived = network === "tron"
    ? deriveTronAddress(mnemonic, index)
    : deriveEthAddress(mnemonic, index);

  return derived.address.toLowerCase() === expectedAddress.toLowerCase();
}
