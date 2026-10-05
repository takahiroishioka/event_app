"use client";

import { useState } from "react";
import { Check, Link as LinkIcon } from "lucide-react";

export default function ShareLinkButton({ path, label = "共有リンクをコピー" }: { path: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const [manualUrl, setManualUrl] = useState("");
  async function copyLink() {
    const url = new URL(path, window.location.origin).href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setManualUrl("");
    } catch {
      setCopied(false);
      setManualUrl(url);
    }
  }
  return <div className="inline-flex max-w-full flex-wrap items-center gap-2">
    <button type="button" onClick={() => void copyLink()} aria-label={label} title={label} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-white text-blue-700 transition hover:bg-blue-50">
      {copied ? <Check size={18} aria-hidden="true" /> : <LinkIcon size={18} aria-hidden="true" />}
    </button>
    <span role="status" className="text-xs text-neutral-500">{copied ? "コピーしました" : manualUrl ? "リンクを選択してコピーしてください" : ""}</span>
    {manualUrl && <input aria-label="共有リンク" value={manualUrl} readOnly onFocus={(event) => event.target.select()} className="w-full min-w-0 rounded-lg border bg-white p-2 text-xs" />}
  </div>;
}
