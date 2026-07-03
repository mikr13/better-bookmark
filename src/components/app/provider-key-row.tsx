import { AlertCircleIcon, CheckCircle2, ExternalLinkIcon, Loader2, Trash2 } from "lucide-react";
import type { KeyboardEvent } from "react";

import { OllamaCorsDialog } from "@/components/app/ollama-cors-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { providerNeedsApiKey, type ProviderConfig } from "@/lib/ai/providers";
import type { AIProvider } from "@/lib/domain";

type ProviderKeyRowProps = {
  readonly provider: AIProvider;
  readonly config: ProviderConfig;
  readonly value: string;
  readonly hasConnection: boolean;
  readonly isSelected: boolean;
  readonly isPending: boolean;
  readonly onChange: (provider: AIProvider, value: string) => void;
  readonly onSave: (provider: AIProvider) => void;
  readonly onDelete: (provider: AIProvider) => void;
};

export function ProviderKeyRow({
  provider,
  config,
  value,
  hasConnection,
  isSelected,
  isPending,
  onChange,
  onSave,
  onDelete,
}: ProviderKeyRowProps) {
  const saveWhenReady = () => {
    if (!providerNeedsApiKey(provider) || value.trim().length > 0) {
      onSave(provider);
    }
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && value.trim().length > 0) {
      onSave(provider);
    }
  };

  if (!providerNeedsApiKey(provider)) {
    return (
      <div className="grid gap-2">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium" htmlFor={`${provider}-connection`}>
            {config.name}
          </label>
          {isSelected ? (
            <Badge className="bg-primary text-primary-foreground">
              <CheckCircle2 className="size-3" />
              Active
            </Badge>
          ) : null}
        </div>
        <Button
          id={`${provider}-connection`}
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => onSave(provider)}
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Test Connection
        </Button>
        <Alert variant="destructive" className="rounded-xl px-4 py-3">
          <AlertCircleIcon className="size-4" />
          <AlertDescription className="flex flex-wrap items-center gap-x-1 gap-y-0 text-sm">
            <span>To use Ollama with this extension, please ensure that</span>
            <OllamaCorsDialog />
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium" htmlFor={`${provider}-key`}>
          {config.name} API Key
        </label>
        {isSelected ? (
          <Badge className="bg-primary text-primary-foreground">
            <CheckCircle2 className="size-3" />
            Active
          </Badge>
        ) : null}
      </div>
      <div className="relative">
        <Input
          id={`${provider}-key`}
          type="password"
          autoComplete="off"
          className={hasConnection && !value ? "pr-28" : undefined}
          placeholder={hasConnection && !value ? "••••••••••••••••" : config.keyPlaceholder}
          value={value}
          onBlur={saveWhenReady}
          onChange={(event) => onChange(provider, event.currentTarget.value)}
          onKeyDown={handleKeyDown}
        />
        {hasConnection && !value ? (
          <div className="absolute top-1 right-1 flex h-[calc(100%-0.5rem)] items-center gap-1">
            <Badge variant="outline" className="bg-background h-7 gap-1">
              <CheckCircle2 className="size-3" />
              Set
            </Badge>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive h-7 w-7"
              onClick={() => onDelete(provider)}
              aria-label={`Delete ${config.name} API key`}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ) : null}
      </div>
      <div className="text-muted-foreground flex items-start justify-between gap-3 text-sm">
        <span>
          {hasConnection && !value
            ? "API key is already configured. Enter a new key to update it."
            : config.description}
        </span>
        {config.apiKeyUrl ? (
          <a
            href={config.apiKeyUrl}
            target="_blank"
            rel="noreferrer"
            className="text-primary inline-flex shrink-0 items-center gap-1 underline-offset-4 hover:underline"
          >
            Get your API key here <ExternalLinkIcon className="size-3" />
          </a>
        ) : null}
      </div>
    </div>
  );
}
