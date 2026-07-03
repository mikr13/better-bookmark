import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  FALLBACK_PROVIDER_MODELS,
  listProviderModels,
  selectedModelForProvider,
} from "@/lib/ai/providers";
import { appSettingsItem, setSettings } from "@/lib/app-storage";
import type { AIProvider, AppSettings } from "@/lib/domain";
import { getProviderApiKey } from "@/lib/security/key-vault";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "../ui/combobox";

type ProviderModelSelectorProps = {
  readonly provider: AIProvider;
  readonly providerName: string;
  readonly settings: AppSettings;
};

export function ProviderModelSelector({
  provider,
  providerName,
  settings,
}: ProviderModelSelectorProps) {
  const queryClient = useQueryClient();
  const models = useQuery({
    queryKey: ["provider-models", provider, settings.configuredProviders[provider]],
    queryFn: async () => {
      const apiKey = await getProviderApiKey(provider);
      return listProviderModels(provider, apiKey ?? undefined);
    },
  });
  const activeModels = models.data ?? FALLBACK_PROVIDER_MODELS[provider];

  return (
    <div className="grid gap-2">
      <label className="text-sm font-medium" htmlFor={`${provider}-model`}>
        {providerName} Model
      </label>
      <Combobox
        id={`${provider}-model-combobox`}
        items={activeModels}
        onValueChange={async (value) => {
          if (!value) {
            return;
          }

          const current = await appSettingsItem.getValue();
          await setSettings({
            selectedProviderModels: {
              ...current.selectedProviderModels,
              [provider]: value,
            },
            selectedOpenAIModel: provider === "openai" ? value : current.selectedOpenAIModel,
          });
          await queryClient.invalidateQueries({ queryKey: ["settings"] });
        }}
        value={selectedModelForProvider(settings, provider)}
      >
        <ComboboxInput placeholder="Select model..." />
        <ComboboxContent>
          <ComboboxEmpty>No models found.</ComboboxEmpty>
          <ComboboxList>
            {activeModels.map((model) => (
              <ComboboxItem key={model.id} value={model.id}>
                {model.name}
              </ComboboxItem>
            ))}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <p className="text-muted-foreground text-sm">
        Choose which {providerName} model to use for bookmark analysis
      </p>
    </div>
  );
}
