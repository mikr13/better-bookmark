import { keyVaultItem, setSettings } from "@/lib/app-storage";
import { decryptText, encryptText, generateSalt } from "@/lib/security/encryption";
import { getBrowserFingerprint } from "@/lib/security/fingerprint";

export function isPlausibleOpenAIKey(value: string): boolean {
  return value.trim().startsWith("sk-") && value.trim().length > 20;
}

export async function storeOpenAIKey(apiKey: string): Promise<void> {
  const trimmed = apiKey.trim();

  if (!isPlausibleOpenAIKey(trimmed)) {
    throw new Error("OpenAI API key should start with sk- and be longer than 20 characters.");
  }

  const salt = await generateSalt();
  const secret = await getBrowserFingerprint();
  const encrypted = await encryptText(trimmed, secret, salt);
  await keyVaultItem.setValue({ openai: { encrypted, salt } });
  await setSettings({ openAIKeyConfigured: true });
}

export async function getOpenAIKey(): Promise<string | null> {
  const vault = await keyVaultItem.getValue();

  if (!vault.openai) {
    return null;
  }

  try {
    return await decryptText(
      vault.openai.encrypted,
      await getBrowserFingerprint(),
      vault.openai.salt,
    );
  } catch {
    return null;
  }
}

export async function deleteOpenAIKey(): Promise<void> {
  await keyVaultItem.setValue({});
  await setSettings({ openAIKeyConfigured: false });
}
