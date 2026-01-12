/**
 * xxhash64 wrapper - Fast non-cryptographic hashing
 * Pattern inspired by mgrep for efficient file change detection
 */
/**
 * Calculate xxhash64 of a string/Buffer
 * @param data - Input data to hash
 * @returns Hash in format "xxh64:abc123..."
 */
export declare function hash(data: string | Buffer): Promise<string>;
/**
 * Synchronous hash (must call initHash() first)
 */
export declare function hashSync(data: string | Buffer): string;
/**
 * Initialize the hash module (call once at startup)
 */
export declare function initHash(): Promise<void>;
/**
 * Verify if data matches expected hash
 */
export declare function verify(data: string | Buffer, expectedHash: string): Promise<boolean>;
/**
 * Hash file content for deduplication
 */
export declare function hashContent(content: string): Promise<string>;
//# sourceMappingURL=hash.d.ts.map