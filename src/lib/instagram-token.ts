import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * AES-256-GCM encryption for Instagram access tokens. Tokens are secrets:
 * they are encrypted before they reach the database and never returned to
 * the browser. The key must be a base64-encoded 32-byte value supplied as
 * INSTAGRAM_TOKEN_ENCRYPTION_KEY (see docs/instagram-connection.md).
 */

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

export interface EncryptedToken {
  ciphertext: string;
  iv: string;
  tag: string;
}

export function getTokenEncryptionKey(
  env: Record<string, string | undefined> = process.env,
): Buffer | null {
  const raw = env.INSTAGRAM_TOKEN_ENCRYPTION_KEY?.trim();
  if (!raw) return null;
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      "INSTAGRAM_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.",
    );
  }
  return key;
}

export function encryptToken(token: string, key: Buffer): EncryptedToken {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptToken(value: EncryptedToken, key: Buffer): string {
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(value.iv, "base64"));
  decipher.setAuthTag(Buffer.from(value.tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(value.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
