function fallbackPart(value: string | undefined, fallback: string): string {
  return value && value.length > 0 ? value : fallback;
}

export async function getBrowserFingerprint(): Promise<string> {
  const parts = [
    fallbackPart(navigator.userAgent, "unknown-agent"),
    fallbackPart(navigator.language, "unknown-language"),
    fallbackPart(navigator.platform, "unknown-platform"),
    String(navigator.hardwareConcurrency || 0),
    Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown-timezone",
  ];
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(parts.join("|")));

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
