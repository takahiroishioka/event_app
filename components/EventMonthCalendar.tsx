"use client";

import { shiftMonth, eventMonth } from "@/lib/event-calendar";

export default function EventMonthCalendar({ month, events, onChange }: {
  month: string;
  events: { id: string; start_at: string | null }[];
  onChange: (month: string) => void;
}) {
  const [year, number] = month.split("-").map(Number);
  const offset = new Date(Date.UTC(year, number - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(year, number, 0)).getUTCDate();
  const counts = new Map<number, number>();
  for (const event of events) {
    if (eventMonth(event.start_at) !== month) continue;
    const day = Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tokyo", day: "numeric" }).format(new Date(event.start_at!)));
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return <div className="mb-6 rounded-3xl bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-bold text-neutral-900">過去のイベント</h2>
      <div className="flex items-center gap-2">
        <button type="button" aria-label="前の月" onClick={() => onChange(shiftMonth(month, -1))} className="rounded-xl border px-3 py-2 text-neutral-700">←</button>
        <input type="month" aria-label="過去のイベントの表示月" value={month} onChange={(event) => { if (/^\d{4}-\d{2}$/.test(event.target.value)) onChange(event.target.value); }} className="min-w-0 rounded-xl border bg-white px-3 py-2 text-sm font-bold text-neutral-900" />
        <button type="button" aria-label="次の月" onClick={() => onChange(shiftMonth(month, 1))} className="rounded-xl border px-3 py-2 text-neutral-700">→</button>
      </div>
    </div>
    <p className="mt-3 text-sm text-neutral-500">月を選ぶと、その月に開催されたイベントを下に表示します。</p>
    <div className="mt-5 grid grid-cols-7 gap-1 text-center">
      {["日", "月", "火", "水", "木", "金", "土"].map((day) => <div key={day} className="pb-2 text-xs font-bold text-neutral-500">{day}</div>)}
      {Array.from({ length: offset }, (_, index) => <div key={`blank:${index}`} />)}
      {Array.from({ length: days }, (_, index) => {
        const day = index + 1, count = counts.get(day) ?? 0;
        return <div key={day} aria-label={`${number}月${day}日、${count}件のイベント`} className={`rounded-xl py-2 text-sm ${count ? "bg-blue-50 font-bold text-blue-700" : "text-neutral-500"}`}>
          <span>{day}</span><span className="mt-1 block h-4 text-[10px]">{count ? `${count}件` : ""}</span>
        </div>;
      })}
    </div>
  </div>;
}
