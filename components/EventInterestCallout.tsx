export default function EventInterestCallout({ lineUrl, title }: { lineUrl: string | null; title: string }) {
  return <section id="application" className="mt-6 scroll-mt-24 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
    <p className="text-sm font-bold text-blue-600">参加希望募集中</p>
    <h2 className="mt-2 text-2xl font-bold text-neutral-900">ご希望に合わせて開催いたします</h2>
    <p className="mt-4 text-sm leading-7 text-neutral-600">参加をご希望の方は、公式LINEで「{title}に参加希望」とお送りください。</p>
    <p className="mt-3 text-sm leading-7 text-neutral-600">難易度が高めの為、公式ラインでやり取りの上開催日を決定させていただきます</p>
    {lineUrl ? <><a href={lineUrl} target="_blank" rel="noopener noreferrer" className="mt-5 block rounded-xl bg-green-600 px-5 py-4 text-center font-bold text-white transition hover:bg-green-700">公式LINEで参加希望を連絡する</a><p className="mt-2 text-center text-xs text-neutral-500">公式LINEが別タブで開きます。参加希望のご連絡で、参加確定ではありません。</p></>
      : <p role="status" className="mt-5 rounded-xl bg-neutral-100 p-4 text-sm text-neutral-600">参加希望の受付を準備中です。後ほどもう一度ご確認ください。</p>}
  </section>;
}
