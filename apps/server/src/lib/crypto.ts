import crypto from 'crypto';

// ─── AES-256-GCM Encryption for Roles ──────────────────────────────────────

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const ENCODING: BufferEncoding = 'hex';

function getEncryptionKey(): Buffer {
    const key = process.env.ROLE_ENCRYPTION_KEY;
    if (!key) {
        throw new Error('ROLE_ENCRYPTION_KEY environment variable is required');
    }
    // Key must be 32 bytes (64 hex chars) for AES-256
    const keyBuffer = Buffer.from(key, 'hex');
    if (keyBuffer.length !== 32) {
        throw new Error('ROLE_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)');
    }
    return keyBuffer;
}

/**
 * Encrypts a role string using AES-256-GCM.
 * Returns a hex string: iv + authTag + ciphertext
 */
export function encryptRole(role: string): string {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(role, 'utf8', ENCODING);
    encrypted += cipher.final(ENCODING);

    const authTag = cipher.getAuthTag();

    // Format: iv(32hex) + tag(32hex) + ciphertext
    return iv.toString(ENCODING) + authTag.toString(ENCODING) + encrypted;
}

/**
 * Decrypts an AES-256-GCM encrypted role string.
 */
export function decryptRole(encryptedData: string): string {
    const key = getEncryptionKey();

    // Extract components
    const iv = Buffer.from(encryptedData.slice(0, IV_LENGTH * 2), ENCODING);
    const authTag = Buffer.from(encryptedData.slice(IV_LENGTH * 2, (IV_LENGTH + TAG_LENGTH) * 2), ENCODING);
    const ciphertext = encryptedData.slice((IV_LENGTH + TAG_LENGTH) * 2);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, ENCODING, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

/**
 * Validates that the encrypted role matches the plain role.
 * Used as an integrity check.
 */
export function verifyRole(plainRole: string, encryptedRole: string): boolean {
    try {
        const decrypted = decryptRole(encryptedRole);
        return decrypted === plainRole;
    } catch {
        return false;
    }
}

/**
 * Generates a new 32-byte encryption key as a hex string.
 * Use this once to generate your ROLE_ENCRYPTION_KEY env var.
 */
export function generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Hashes data using SHA-256 (for non-reversible hashing).
 */
export function hashSHA256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generates a cryptographically secure random token.
 */
export function generateSecureToken(bytes: number = 48): string {
    return crypto.randomBytes(bytes).toString('hex');
}
