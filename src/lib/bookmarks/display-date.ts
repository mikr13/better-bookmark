export function formatBookmarkDate(value: string, now = new Date()): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const includesYear = date.getFullYear() !== now.getFullYear();
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "long",
    ...(includesYear ? { year: "numeric" } : {}),
  }).format(date);
}
