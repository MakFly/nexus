/**
 * @nexus/core - Crypto utilities for API key encryption
 * Sprint 7: Settings System - AES-256-GCM encryption
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const SALT = 'nexus-salt';
const KEY_LENGTH = 32; // 256 bits

/**
 * Get encryption secret from environment or derive from machine ID
 */
function getSecret(): string {
  // Check for explicit secret in env
  if (process.env.NEXUS_ENCRYPTION_SECRET) {
    return process.env.NEXUS_ENCRYPTION_SECRET;
  }

  // Fallback: use a combination of machine-specific values
  // In production, this should be stored securely (e.g., keychain, encrypted file)
  const hostname = process.env.HOSTNAME || 'localhost';
  const user = process.env.USER || process.env.USERNAME || 'nexus';
  return `${user}@${hostname}:nexus-encryption-v1`;
}

/**
 * Derive a 256-bit key from the secret using scrypt
 */
function deriveKey(secret: string): Buffer {
  return scryptSync(secret, SALT, KEY_LENGTH);
}

/**
 * Encrypt an API key using AES-256-GCM
 * @param apiKey - The API key to encrypt
 * @param secret - Optional secret (defaults to getSecret())
 * @returns Encrypted value in format "ENC:iv:authTag:encrypted"
 */
export function encryptApiKey(apiKey: string, secret?: string): string {
  const key = deriveKey(secret || getSecret());
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  // Format: ENC:iv:authTag:encrypted
  return `ENC:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt an API key encrypted with encryptApiKey
 * @param encryptedValue - The encrypted value in format "ENC:iv:authTag:encrypted"
 * @param secret - Optional secret (defaults to getSecret())
 * @returns The decrypted API key
 */
export function decryptApiKey(encryptedValue: string, secret?: string): string {
  if (!encryptedValue.startsWith('ENC:')) {
    return encryptedValue; // Not encrypted (migration or plaintext)
  }

  const parts = encryptedValue.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted value format');
  }

  const [, ivHex, authTagHex, encrypted] = parts;
  const key = deriveKey(secret || getSecret());
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Mask an API key for display (show only first 4 and last 4 characters)
 * @param apiKey - The API key to mask
 * @returns Masked key like "sk-an...xyz"
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length <= 12) {
    return '********';
  }
  return `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`;
}

/**
 * Mask an encrypted API key for display
 * @param encryptedKey - The encrypted API key
 * @param secret - Optional secret (defaults to getSecret())
 * @returns Masked key
 */
export function maskEncryptedApiKey(encryptedKey: string, secret?: string): string {
  const decrypted = decryptApiKey(encryptedKey, secret);
  return maskApiKey(decrypted);
}

/**
 * Check if a value is encrypted
 * @param value - The value to check
 * @returns True if the value is in encrypted format
 */
export function isEncrypted(value: string): boolean {
  return value.startsWith('ENC:');
}

/**
 * Encrypt sensitive settings values before storing
 * @param key - Setting key
 * @param value - Setting value
 * @param secret - Optional secret
 * @returns Encrypted value if key is sensitive, otherwise original value
 */
export function encryptSettingValue(key: string, value: string, secret?: string): string {
  const sensitiveKeys = [
    'api_key',
    'apikey',
    'anthropic_api_key',
    'mistral_api_key',
    'openai_api_key',
    'token',
    'password',
    'secret'
  ];

  const isSensitive = sensitiveKeys.some(sensitive =>
    key.toLowerCase().includes(sensitive)
  );

  return isSensitive ? encryptApiKey(value, secret) : value;
}

/**
 * Decrypt sensitive settings values after retrieving
 * @param key - Setting key
 * @param value - Setting value
 * @param secret - Optional secret
 * @returns Decrypted value if key is sensitive, otherwise original value
 */
export function decryptSettingValue(key: string, value: string, secret?: string): string {
  const sensitiveKeys = [
    'api_key',
    'apikey',
    'anthropic_api_key',
    'mistral_api_key',
    'openai_api_key',
    'token',
    'password',
    'secret'
  ];

  const isSensitive = sensitiveKeys.some(sensitive =>
    key.toLowerCase().includes(sensitive)
  );

  return isSensitive && isEncrypted(value) ? decryptApiKey(value, secret) : value;
}
