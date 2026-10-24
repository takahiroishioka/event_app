"use client";

export default function EventScheduleFields({ displayOrder, onDisplayOrderChange, undecided, onUndecidedChange, startAt, endAt, onStartChange, onEndChange, disabled }: {
  undecided: boolean; onUndecidedChange: (value: boolean) => void;
  startAt: string; endAt: string; onStartChange: (value: string) => void; onEndChange: (value: string) => void;
  disabled: boolean;
  displayOrder: number; onDisplayOrderChange: (value: number) => void;
}) {
  return <section>
    <label className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-neutral-900">
      <input type="checkbox" checked={undecided} onChange={(event) => onUndecidedChange(event.target.checked)} disabled={disabled} />
      開催日未定で参加希望を募る
    </label>
    {undecided && <label className="mt-4 block text-sm font-bold text-neutral-900">開催未定一覧の表示順<input type="number" required min={0} max={2147483647} step={1} value={displayOrder} onChange={(event) => onDisplayOrderChange(event.target.valueAsNumber)} disabled={disabled} className="mt-2 block w-full rounded-xl border border-neutral-300 bg-white px-4 py-3" /><span className="mt-2 block text-xs font-normal text-neutral-600">小さい数字から表示します。同じ数字の場合はタイトル順です。</span></label>}
    {undecided ? <p className="mt-3 text-sm leading-6 text-neutral-600">開催日時を保存せず、公式LINEで参加希望を受け付けます。日程が決まったらチェックを外し、開催日時を設定してください。公式LINEのURLはフッター設定を使用します。</p>
      : <div className="mt-5 grid gap-6 sm:grid-cols-2">
        <label className="block text-sm font-bold text-neutral-900">開始日時<input type="datetime-local" required value={startAt} onChange={(event) => onStartChange(event.target.value)} disabled={disabled} className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 font-normal text-neutral-900" /></label>
        <label className="block text-sm font-bold text-neutral-900">終了日時<input type="datetime-local" value={endAt} onChange={(event) => onEndChange(event.target.value)} disabled={disabled} className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 font-normal text-neutral-900" /></label>
      </div>}
  </section>;
}
