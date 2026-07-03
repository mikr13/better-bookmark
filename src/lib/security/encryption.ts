import { z } from "zod";

export class EncryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EncryptionError";
  }
}

const EncryptedPayloadSchema = z.object({
  iv: z.string().min(1),
  ciphertext: z.string().min(1),
});

function toBase64(bytes: Uint8Array): string {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

export async function generateSalt(): Promise<string> {
  return toBase64(crypto.getRandomValues(new Uint8Array(16)));
}

async function deriveKey(secret: string, salt: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: toArrayBuffer(fromBase64(salt)),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptText(
  plaintext: string,
  secret: string,
  salt: string,
): Promise<string> {
  try {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(secret, salt);
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      new TextEncoder().encode(plaintext),
    );

    return JSON.stringify({
      iv: toBase64(iv),
      ciphertext: toBase64(new Uint8Array(ciphertext)),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown failure";
    throw new EncryptionError(`Encryption failed: ${message}`);
  }
}

export async function decryptText(
  encryptedPayload: string,
  secret: string,
  salt: string,
): Promise<string> {
  try {
    const parsed = EncryptedPayloadSchema.parse(JSON.parse(encryptedPayload));
    const key = await deriveKey(secret, salt);
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: toArrayBuffer(fromBase64(parsed.iv)) },
      key,
      toArrayBuffer(fromBase64(parsed.ciphertext)),
    );

    return new TextDecoder().decode(plaintext);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown failure";
    throw new EncryptionError(`Decryption failed: ${message}`);
  }
}
