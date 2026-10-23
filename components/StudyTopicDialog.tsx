"use client";

import { useEffect, useRef } from "react";
import { studyTopicDetails, type StudyTopic } from "@/lib/study-requests";

export default function StudyTopicDialog({ topic, saving, onClose, onRequest }: {
  topic: StudyTopic;
  saving: boolean;
  onClose: () => void;
  onRequest: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return <dialog ref={ref} aria-labelledby="study-topic-title" onClose={onClose}
    onClick={(event) => { if (event.target === event.currentTarget) ref.current?.close(); }}
    className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-3xl bg-white p-0 text-neutral-900 shadow-xl backdrop:bg-black/50">
    <div className="p-6 sm:p-8">
      <div className="mb-5 flex justify-end"><button type="button" onClick={() => ref.current?.close()} className="rounded-lg border px-4 py-2 text-sm font-bold focus-visible:outline-2 focus-visible:outline-blue-600">閉じる</button></div>
      {topic.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={topic.image_url} alt={topic.title} className="mb-5 w-full rounded-xl bg-neutral-100 object-contain" />
      )}
      <h2 id="study-topic-title" className="break-words text-2xl font-bold">{topic.title}</h2>
      <p className="mt-4 font-bold text-blue-700">{studyTopicDetails(topic)}</p>
      <p className="mt-5 whitespace-pre-wrap break-words text-sm leading-7 text-neutral-700">{topic.description || "内容の詳細はお問い合わせください。"}</p>
      <button type="button" disabled={saving} onClick={onRequest} className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-4 font-bold text-white disabled:opacity-50">この勉強会の開催を希望する</button>
    </div>
  </dialog>;
}
