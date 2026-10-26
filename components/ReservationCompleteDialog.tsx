"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

export type ReservationCompletion = {
  guest: boolean;
  waiting: boolean;
  mailSent?: boolean;
};

export default function ReservationCompleteDialog({ completion, onClose }: {
  completion: ReservationCompletion | null;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!completion || !element) return;
    element.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [completion]);

  return (
    <dialog ref={dialog} onClose={onClose} aria-labelledby="reservation-complete-title" className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-3xl bg-white p-6 text-neutral-900 shadow-xl backdrop:bg-black/40 sm:p-8">
      {completion && <>
        <p className="text-sm font-bold text-blue-600">お申し込み受付完了</p>
        <h2 id="reservation-complete-title" className="mt-3 text-2xl font-bold">お申し込みありがとうございました</h2>
        <p className="mt-4 text-sm leading-7">{completion.waiting ? "キャンセル待ちとして受け付けました。現時点では参加確定ではありません。" : "イベントへの参加申込みを受け付けました。"}</p>
        {completion.guest ? <>
          <p className="mt-4 text-sm leading-7">{completion.mailSent ? "入力いただいたメールアドレスに確認メールを送りました。申込内容はメールでご確認ください。" : "確認メールを送信できませんでしたが、お申し込みは受け付け済みです。この画面を閉じて、メール送信の再試行ボタンをご利用ください。"}</p>
          <div className="mt-5 rounded-2xl bg-blue-50 p-4 text-sm leading-7">
            次回からログインしてお申し込みいただくと、マイページで申込内容を確認できます。
            <p className="mt-2 text-xs text-neutral-600">今回のゲスト申込みは、後からログインしてもマイページには表示されません。</p>
          </div>
        </> : <>
          <p className="mt-4 text-sm leading-7">申込内容はマイページで確認できます。</p>
          <Link href="/mypage" className="mt-6 block rounded-xl bg-blue-600 px-5 py-3 text-center font-bold text-white hover:bg-blue-700">マイページで確認する</Link>
        </>}
        <button type="button" onClick={onClose} className="mt-4 w-full rounded-xl border border-neutral-300 px-5 py-3 font-bold hover:bg-neutral-50">イベントページに戻る</button>
      </>}
    </dialog>
  );
}
