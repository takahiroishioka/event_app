export type Confirmation = {
  registrationId: string; eventId: string; name: string; email: string; title: string;
  startAt: string; location: string | null; fee: number; planName: string | null; reservationStatus: string;
};
export function confirmationMessage(data: Confirmation, siteUrl: string) {
  const waiting = data.reservationStatus === "waiting";
  const status = waiting ? "キャンセル待ち受付" : "参加申込み受付";
  const date = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", dateStyle: "full", timeStyle: "short" }).format(new Date(data.startAt));
  return {
    subject: `【${status}】${data.title.replace(/[\r\n]/g, " ")}`,
    text: [
      `${data.name} 様`, "", `${data.title}へのお申し込みを受け付けました。`,
      waiting ? "現在はキャンセル待ちです。参加確定ではありません。" : "参加申込みの受付が完了しました。",
      "", `受付番号：${data.registrationId}`, `開催日時：${date}（日本時間）`,
      `会場：${data.location || "イベントページをご確認ください。"}`,
      ...(data.planName ? [`プラン：${data.planName}`] : []),
      `参加費：${data.fee === 0 ? "無料" : `${data.fee.toLocaleString("ja-JP")}円`}`,
      "", `イベント詳細：${new URL(`/events/${data.eventId}`, siteUrl).href}`,
      "", "このメールはお申し込みの受付通知です。お支払いの完了を示すものではありません。",
      "変更・キャンセルのご相談は、イベントページに記載の主催者連絡先へお願いします。",
    ].join("\n"),
  };
}
