import { providerNeedsApiKey } from "@/lib/ai/providers";
import { appSettingsItem, keyVaultItem, setSettings } from "@/lib/app-storage";
import type { AIProvider } from "@/lib/domain";
import { decryptText, encryptText, generateSalt } from "@/lib/security/encryption";
import { getBrowserFingerprint } from "@/lib/security/fingerprint";

export async function storeProviderKey(provider: AIProvider, apiKey: string): Promise<void> {
  const trimmed = apiKey.trim();

  if (!providerNeedsApiKey(provider)) {
    return;
  }

  if (trimmed.length === 0) {
    throw new Error("API key is required.");
  }

  const salt = await generateSalt();
  const secret = await getBrowserFingerprint();
  const encrypted = await encryptText(trimmed, secret, salt);
  const currentVault = await keyVaultItem.getValue();
  const currentSettings = await appSettingsItem.getValue();
  await keyVaultItem.setValue({ ...currentVault, [provider]: { encrypted, salt } });
  await setSettings({
    configuredProviders: { ...currentSettings.configuredProviders, [provider]: true },
    openAIKeyConfigured: provider === "openai" ? true : currentSettings.openAIKeyConfigured,
  });
}

export async function storeOpenAIKey(apiKey: string): Promise<void> {
  await storeProviderKey("openai", apiKey);
}

async function getStoredProviderKey(provider: AIProvider): Promise<string | null> {
  const vault = await keyVaultItem.getValue();
  const encryptedKey = vault[provider];

  if (!encryptedKey) {
    return null;
  }

  try {
    return await decryptText(
      encryptedKey.encrypted,
      await getBrowserFingerprint(),
      encryptedKey.salt,
    );
  } catch {
    return null;
  }
}

export async function getOpenAIKey(): Promise<string | null> {
  return getStoredProviderKey("openai");
}

function assertNever(_value: never): never {
  throw new Error("Unsupported AI provider.");
}

export function getProviderApiKey(provider: AIProvider): Promise<string | null> {
  switch (provider) {
    case "openai":
    case "anthropic":
    // case "groq":
    // case "deepseek":
    case "gemini":
      return getStoredProviderKey(provider);
    case "ollama":
      return Promise.resolve(null);
    default:
      return assertNever(provider);
  }
}

export async function deleteProviderKey(provider: AIProvider): Promise<void> {
  const currentVault = await keyVaultItem.getValue();
  const currentSettings = await appSettingsItem.getValue();
  const nextVault = { ...currentVault };
  delete nextVault[provider];
  await keyVaultItem.setValue(nextVault);
  await setSettings({
    configuredProviders: { ...currentSettings.configuredProviders, [provider]: false },
    openAIKeyConfigured: provider === "openai" ? false : currentSettings.openAIKeyConfigured,
  });
}

export async function deleteOpenAIKey(): Promise<void> {
  await deleteProviderKey("openai");
}
