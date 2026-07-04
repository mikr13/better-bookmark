import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { ProviderKeyRow } from "@/components/app/provider-key-row";
import { ProviderModelSelector } from "@/components/app/provider-model-selector";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  AI_PROVIDER_IDS,
  defaultModelForProvider,
  getProviderConfig,
  isProviderConfigured,
  listProviderModels,
  providerNeedsApiKey,
  validateProviderConnection,
} from "@/lib/ai/providers";
import { appSettingsItem, setSettings } from "@/lib/app-storage";
import { AIProviderSchema, type AIProvider } from "@/lib/domain";
import { deleteProviderKey, getProviderApiKey, storeProviderKey } from "@/lib/security/key-vault";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "../ui/combobox";

function parseProvider(value: string | null | undefined): AIProvider | null {
  const parsed = AIProviderSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function ProviderSettings() {
  const queryClient = useQueryClient();
  const [providerKeys, setProviderKeys] = useState<Partial<Record<AIProvider, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: () => appSettingsItem.getValue(),
  });
  const saveProvider = useMutation({
    mutationFn: async (provider: AIProvider) => {
      setError(null);
      const current = await appSettingsItem.getValue();
      const key = providerKeys[provider]?.trim() ?? "";

      if (providerNeedsApiKey(provider)) {
        const isValid = await validateProviderConnection(provider, key);

        if (!isValid) {
          throw new Error(`Invalid ${getProviderConfig(provider).name} API key.`);
        }

        await storeProviderKey(provider, key);
      } else {
        const isValid = await validateProviderConnection(provider);

        if (!isValid) {
          throw new Error("Ollama is not reachable at http://localhost:11434.");
        }

        await setSettings({
          configuredProviders: { ...current.configuredProviders, [provider]: true },
        });
      }

      const providerKey = await getProviderApiKey(provider);
      const models = await listProviderModels(provider, providerKey ?? undefined);
      const selectedModel = models[0]?.id ?? defaultModelForProvider(provider);
      await setSettings({
        selectedAIProvider: provider,
        selectedProviderModels: {
          ...current.selectedProviderModels,
          [provider]: selectedModel,
        },
        selectedOpenAIModel: provider === "openai" ? selectedModel : current.selectedOpenAIModel,
      });
      return provider;
    },
    onSuccess: async (provider) => {
      setProviderKeys((current) => ({ ...current, [provider]: "" }));
      await queryClient.invalidateQueries({ queryKey: ["settings"] });
      await queryClient.invalidateQueries({ queryKey: ["provider-models"] });
    },
    onError: (cause) => {
      setError(cause instanceof Error ? cause.message : "Could not save provider settings.");
    },
  });
  const deleteKey = useMutation({
    mutationFn: deleteProviderKey,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settings"] });
      await queryClient.invalidateQueries({ queryKey: ["provider-models"] });
    },
  });
  const currentSettings = settings.data;
  const selectedProvider = currentSettings?.selectedAIProvider ?? "openai";

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Provider</CardTitle>
        <CardDescription>
          Configure your AI provider API keys. Quality of bookmark analysis depends on the AI model
          used.{" "}
          <strong className="underline">Recommended to use the latest models available</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        {AI_PROVIDER_IDS.map((provider) => {
          const config = getProviderConfig(provider);
          const hasConnection = currentSettings
            ? isProviderConfigured(currentSettings, provider)
            : false;
          const isSelected = selectedProvider === provider;
          const showModelSelector = currentSettings && hasConnection && isSelected;

          return (
            <div
              key={provider}
              className={
                showModelSelector
                  ? "grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(280px,0.95fr)]"
                  : "grid gap-3"
              }
            >
              <ProviderKeyRow
                provider={provider}
                config={config}
                value={providerKeys[provider] ?? ""}
                hasConnection={hasConnection}
                isSelected={isSelected}
                isPending={saveProvider.isPending}
                onChange={(nextProvider, value) =>
                  setProviderKeys((current) => ({ ...current, [nextProvider]: value }))
                }
                onSave={(nextProvider) => saveProvider.mutate(nextProvider)}
                onDelete={(nextProvider) => deleteKey.mutate(nextProvider)}
              />
              {showModelSelector ? (
                <ProviderModelSelector
                  provider={provider}
                  providerName={config.name}
                  settings={currentSettings}
                />
              ) : null}
            </div>
          );
        })}

        {error ? <p className="text-destructive text-sm">{error}</p> : null}
        <Separator />

        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="current-provider">
            Current Provider
          </label>
          <Combobox
            id="current-provider-combobox"
            items={AI_PROVIDER_IDS.map((provider) => getProviderConfig(provider))}
            onValueChange={async (value) => {
              const provider = parseProvider(value);

              if (
                !provider ||
                !currentSettings ||
                !isProviderConfigured(currentSettings, provider)
              ) {
                return;
              }

              await setSettings({ selectedAIProvider: provider });
              await queryClient.invalidateQueries({ queryKey: ["settings"] });
            }}
            value={selectedProvider}
          >
            <ComboboxInput placeholder="Select provider..." />
            <ComboboxContent>
              <ComboboxEmpty>No provider found.</ComboboxEmpty>
              <ComboboxList>
                {AI_PROVIDER_IDS.map((provider) => {
                  const config = getProviderConfig(provider);
                  const disabled =
                    currentSettings === undefined ||
                    !isProviderConfigured(currentSettings, provider);

                  return (
                    <ComboboxItem key={provider} value={provider} disabled={disabled}>
                      {config.name}
                    </ComboboxItem>
                  );
                })}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
          <p className="text-muted-foreground text-sm">
            Choose which AI provider to use for bookmark analysis
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
