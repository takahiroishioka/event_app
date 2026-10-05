export function eventMonth(value: string | null): string {
  return value ? new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit" }).format(new Date(value)) : "";
}

export function isPastEvent(event: { start_at: string | null; end_at?: string | null }, now = Date.now()): boolean {
  const end = event.end_at ?? event.start_at;
  return end ? new Date(end).getTime() < now : false;
}

export function shiftMonth(month: string, offset: number): string {
  const [year, number] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, number - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
