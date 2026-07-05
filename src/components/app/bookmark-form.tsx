import { Loader2, Save, X } from "lucide-react";
import { useEffect, useId, useMemo, useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ManualBookmarkInput } from "@/lib/bookmarks/repository";
import type { SavedBookmark } from "@/lib/domain";

type BookmarkFormValues = {
  readonly url: string;
  readonly title: string;
  readonly summary: string;
  readonly tags: string;
};

type BookmarkFormErrors = Partial<Record<keyof BookmarkFormValues, string>>;

const EMPTY_VALUES: BookmarkFormValues = {
  url: "",
  title: "",
  summary: "",
  tags: "",
};

function valuesFromBookmark(bookmark: SavedBookmark | null): BookmarkFormValues {
  if (!bookmark) {
    return EMPTY_VALUES;
  }

  return {
    url: bookmark.url,
    title: bookmark.title,
    summary: bookmark.summary,
    tags: bookmark.tags.join(", "),
  };
}

function parseTags(value: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];

  for (const rawTag of value.split(/[,\n;]/u)) {
    const tag = rawTag.trim();
    const key = tag.toLocaleLowerCase();

    if (!tag || seen.has(key)) {
      continue;
    }

    seen.add(key);
    tags.push(tag);
  }

  return tags;
}

function validate(values: BookmarkFormValues): BookmarkFormErrors {
  const errors: BookmarkFormErrors = {};
  const parsedUrl = URL.canParse(values.url) ? new URL(values.url) : null;

  if (!parsedUrl) {
    errors.url = "Enter a valid URL.";
  }

  if (!values.title.trim()) {
    errors.title = "Title is required.";
  }

  if (!values.summary.trim()) {
    errors.summary = "Summary is required.";
  }

  return errors;
}

export function BookmarkForm({
  bookmark,
  isSaving,
  onCancel,
  onSubmit,
  status,
}: {
  readonly bookmark: SavedBookmark | null;
  readonly isSaving: boolean;
  readonly onCancel?: () => void;
  readonly onSubmit: (input: ManualBookmarkInput) => Promise<void>;
  readonly status: string;
}) {
  const [values, setValues] = useState<BookmarkFormValues>(valuesFromBookmark(bookmark));
  const [errors, setErrors] = useState<BookmarkFormErrors>({});
  const urlId = useId();
  const titleId = useId();
  const summaryId = useId();
  const tagsId = useId();
  const mode = bookmark ? "edit" : "create";
  const parsedTags = useMemo(() => parseTags(values.tags), [values.tags]);

  useEffect(() => {
    setValues(valuesFromBookmark(bookmark));
    setErrors({});
  }, [bookmark]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape" && onCancel) {
        onCancel();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [bookmark, onCancel]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    await onSubmit({
      url: values.url.trim(),
      title: values.title.trim(),
      summary: values.summary.trim(),
      tags: parsedTags,
    });

    if (!bookmark) {
      setValues(EMPTY_VALUES);
    }
  }

  function handleCancel(): void {
    setValues(valuesFromBookmark(bookmark));
    setErrors({});
    onCancel?.();
  }

  return (
    <form className="space-y-2" onSubmit={(event) => void handleSubmit(event)}>
      <FieldGroup className="gap-2">
        <Field data-invalid={Boolean(errors.url)}>
          <FieldLabel htmlFor={urlId}>URL</FieldLabel>
          <Input
            id={urlId}
            value={values.url}
            onChange={(event) => setValues({ ...values, url: event.currentTarget.value })}
            placeholder="https://example.com/source"
            aria-invalid={Boolean(errors.url)}
            aria-describedby={errors.url ? `${urlId}-error` : undefined}
          />
          <FieldError id={`${urlId}-error`}>{errors.url}</FieldError>
        </Field>
        <Field data-invalid={Boolean(errors.title)}>
          <FieldLabel htmlFor={titleId}>Title</FieldLabel>
          <Input
            id={titleId}
            value={values.title}
            onChange={(event) => setValues({ ...values, title: event.currentTarget.value })}
            placeholder="Short source title"
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? `${titleId}-error` : undefined}
          />
          <FieldError id={`${titleId}-error`}>{errors.title}</FieldError>
        </Field>
        <Field data-invalid={Boolean(errors.summary)}>
          <FieldLabel htmlFor={summaryId}>Summary</FieldLabel>
          <Textarea
            id={summaryId}
            value={values.summary}
            onChange={(event) => setValues({ ...values, summary: event.currentTarget.value })}
            placeholder="Why this bookmark matters"
            aria-invalid={Boolean(errors.summary)}
            aria-describedby={errors.summary ? `${summaryId}-error` : undefined}
            className="min-h-28"
          />
          <FieldError id={`${summaryId}-error`}>{errors.summary}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor={tagsId}>Tags</FieldLabel>
          <Input
            id={tagsId}
            value={values.tags}
            onChange={(event) => setValues({ ...values, tags: event.currentTarget.value })}
            placeholder="local-first, research, browser extension"
          />
          <FieldDescription>Separate tags with commas, semicolons, or new lines.</FieldDescription>
          {parsedTags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {parsedTags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}
        </Field>
      </FieldGroup>
      <Field orientation="horizontal" className="items-center pt-2">
        <p className="text-muted-foreground min-w-0 flex-1 text-sm" aria-live="polite">
          {status}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" variant="outline" onClick={handleCancel}>
            <X />
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
            {mode === "edit" ? "Update Bookmark" : "Save Bookmark"}
          </Button>
        </div>
      </Field>
    </form>
  );
}
