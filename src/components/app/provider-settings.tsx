import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ExternalLink, KeyRound, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FALLBACK_OPENAI_MODELS, listOpenAIModels, validateOpenAIKey } from "@/lib/ai/openai";
import { appSettingsItem, setSettings } from "@/lib/app-storage";
import {
  deleteOpenAIKey,
  getOpenAIKey,
  isPlausibleOpenAIKey,
  storeOpenAIKey,
} from "@/lib/security/key-vault";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "../ui/combobox";

export function ProviderSettings() {
  const queryClient = useQueryClient();
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: () => appSettingsItem.getValue(),
  });
  const models = useQuery({
    queryKey: ["openai-models", settings.data?.openAIKeyConfigured],
    queryFn: async () => {
      const key = await getOpenAIKey();
      return key ? listOpenAIModels(key) : FALLBACK_OPENAI_MODELS;
    },
  });
  const saveKey = useMutation({
    mutationFn: async () => {
      setError(null);
      const trimmed = apiKey.trim();

      if (!isPlausibleOpenAIKey(trimmed)) {
        throw new Error("OpenAI API key should start with sk- and be longer than 20 characters.");
      }

      const isValid = await validateOpenAIKey(trimmed);

      if (!isValid) {
        throw new Error("Invalid OpenAI API key.");
      }

      await storeOpenAIKey(trimmed);
      const fetched = await listOpenAIModels(trimmed);
      await setSettings({ selectedOpenAIModel: fetched[0]?.id ?? "gpt-5.5" });
      return fetched;
    },
    onSuccess: async () => {
      setApiKey("");
      await queryClient.invalidateQueries({ queryKey: ["settings"] });
      await queryClient.invalidateQueries({ queryKey: ["openai-models"] });
    },
    onError: (cause) => {
      setError(cause instanceof Error ? cause.message : "Could not save API key.");
    },
  });
  const deleteKey = useMutation({
    mutationFn: deleteOpenAIKey,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settings"] });
      await queryClient.invalidateQueries({ queryKey: ["openai-models"] });
    },
  });
  const configured = settings.data?.openAIKeyConfigured ?? false;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>OpenAI Provider</CardTitle>
            <CardDescription>
              Better Bookmarks only lists models that can use page text and screenshots.
            </CardDescription>
          </div>
          {configured ? (
            <Badge className="bg-primary text-primary-foreground">
              <CheckCircle2 className="size-3" />
              Active
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="openai-key">
            OpenAI API key
          </label>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
            <Input
              id="openai-key"
              type="password"
              autoComplete="off"
              className="col-span-2 sm:col-span-1"
              placeholder={configured ? "Saved locally. Enter a new key to replace it." : "sk-..."}
              value={apiKey}
              onChange={(event) => setApiKey(event.currentTarget.value)}
            />
            <Button
              type="button"
              disabled={saveKey.isPending || apiKey.trim().length === 0}
              className="justify-center"
              onClick={() => saveKey.mutate()}
            >
              {saveKey.isPending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound />}
              Save
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!configured || deleteKey.isPending}
              onClick={() => deleteKey.mutate()}
              aria-label="Delete OpenAI key"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
          <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-sm">
            <span>Encrypted locally; never exported by default.</span>
            <a
              className="text-primary inline-flex items-center gap-1 underline-offset-4 hover:underline"
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noreferrer"
            >
              Get key <ExternalLink className="size-3" />
            </a>
          </div>
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="openai-model">
            Multimodal model
          </label>
          <Combobox
            id="openai-model-combobox"
            items={models.data ?? FALLBACK_OPENAI_MODELS}
            onValueChange={(value) => setSettings({ selectedOpenAIModel: value ?? "" })}
            value={settings.data?.selectedOpenAIModel ?? ""}
          >
            <ComboboxInput placeholder="Select a framework" />
            <ComboboxContent>
              <ComboboxEmpty>No items found.</ComboboxEmpty>
              <ComboboxList>
                {(models.data ?? FALLBACK_OPENAI_MODELS).map((model) => (
                  <ComboboxItem key={model.id} value={model.id}>
                    {model.name}
                  </ComboboxItem>
                ))}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
          <p className="text-muted-foreground text-sm">
            Models are fetched after the key is saved. The list is filtered to screenshot and text
            capable GPT models.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
