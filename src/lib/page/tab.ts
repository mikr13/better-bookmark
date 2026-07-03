const SCREENSHOT_PERMISSION_ERROR =
  "Either the '<all_urls>' or 'activeTab' permission is required.";
const NON_WEB_PAGE_MESSAGE =
  "Open a normal webpage before saving. Browser settings and extension pages cannot be saved.";

export function saveablePageUrl(url: string | undefined): string | null {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : null;
  } catch (error) {
    if (error instanceof TypeError) {
      return null;
    }

    throw error;
  }
}

export function pageSaveFailureMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Save failed";

  if (message.includes(SCREENSHOT_PERMISSION_ERROR)) {
    return NON_WEB_PAGE_MESSAGE;
  }

  return message;
}

export function nonWebPageSaveMessage(): string {
  return NON_WEB_PAGE_MESSAGE;
}
