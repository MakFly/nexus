/**
 * @nexus/core - Crypto utilities for API key encryption
 * Sprint 7: Settings System - AES-256-GCM encryption
 */
/**
 * Encrypt an API key using AES-256-GCM
 * @param apiKey - The API key to encrypt
 * @param secret - Optional secret (defaults to getSecret())
 * @returns Encrypted value in format "ENC:iv:authTag:encrypted"
 */
export declare function encryptApiKey(apiKey: string, secret?: string): string;
/**
 * Decrypt an API key encrypted with encryptApiKey
 * @param encryptedValue - The encrypted value in format "ENC:iv:authTag:encrypted"
 * @param secret - Optional secret (defaults to getSecret())
 * @returns The decrypted API key
 */
export declare function decryptApiKey(encryptedValue: string, secret?: string): string;
/**
 * Mask an API key for display (show only first 4 and last 4 characters)
 * @param apiKey - The API key to mask
 * @returns Masked key like "sk-an...xyz"
 */
export declare function maskApiKey(apiKey: string): string;
/**
 * Mask an encrypted API key for display
 * @param encryptedKey - The encrypted API key
 * @param secret - Optional secret (defaults to getSecret())
 * @returns Masked key
 */
export declare function maskEncryptedApiKey(encryptedKey: string, secret?: string): string;
/**
 * Check if a value is encrypted
 * @param value - The value to check
 * @returns True if the value is in encrypted format
 */
export declare function isEncrypted(value: string): boolean;
/**
 * Encrypt sensitive settings values before storing
 * @param key - Setting key
 * @param value - Setting value
 * @param secret - Optional secret
 * @returns Encrypted value if key is sensitive, otherwise original value
 */
export declare function encryptSettingValue(key: string, value: string, secret?: string): string;
/**
 * Decrypt sensitive settings values after retrieving
 * @param key - Setting key
 * @param value - Setting value
 * @param secret - Optional secret
 * @returns Decrypted value if key is sensitive, otherwise original value
 */
export declare function decryptSettingValue(key: string, value: string, secret?: string): string;
//# sourceMappingURL=crypto.d.ts.map