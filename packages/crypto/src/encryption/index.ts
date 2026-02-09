import { createCipheriv, createDecipheriv, randomBytes, scrypt } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Encripta una clave privada usando AES-256-GCM
 * @param privateKey - La clave privada a encriptar
 * @param masterPassword - Password maestro (de variable de entorno)
 * @returns String encriptado en formato: salt:iv:tag:ciphertext (todo en hex)
 */
export async function encryptPrivateKey(
  privateKey: string,
  masterPassword: string
): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);

  // Derivar key del master password usando scrypt
  const key = (await scryptAsync(masterPassword, salt, KEY_LENGTH)) as Buffer;

  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(privateKey, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Formato: salt:iv:tag:ciphertext
  return [
    salt.toString("hex"),
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted,
  ].join(":");
}

/**
 * Desencripta una clave privada
 * @param encryptedData - String encriptado en formato salt:iv:tag:ciphertext
 * @param masterPassword - Password maestro
 * @returns La clave privada desencriptada
 */
export async function decryptPrivateKey(
  encryptedData: string,
  masterPassword: string
): Promise<string> {
  const parts = encryptedData.split(":");
  if (parts.length !== 4) {
    throw new Error("Invalid encrypted data format");
  }

  const [saltHex, ivHex, tagHex, ciphertext] = parts;

  const salt = Buffer.from(saltHex, "hex");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(tagHex, "hex");

  // Derivar key del master password
  const key = (await scryptAsync(masterPassword, salt, KEY_LENGTH)) as Buffer;

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Genera un API key seguro
 * @returns Un API key de 32 bytes en formato hex
 */
export function generateApiKey(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Hashea un API key para almacenamiento seguro
 * @param apiKey - El API key a hashear
 * @returns Hash SHA-256 del API key
 */
export async function hashApiKey(apiKey: string): Promise<string> {
  const { createHash } = await import("crypto");
  return createHash("sha256").update(apiKey).digest("hex");
}
