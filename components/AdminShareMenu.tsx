"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

const subscribeToOrigin = () => () => {};

export default function AdminShareMenu() {
  const origin = useSyncExternalStore(subscribeToOrigin, () => window.location.origin, () => "");
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  async function copySignupUrl(path: string) {
    const url = new URL(path, window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(url);
      setCopiedPath(path);
      window.setTimeout(() => setCopiedPath((current) => current === path ? null : current), 2000);
    } catch {
      window.prompt("以下のURLをコピーしてください。", url);
    }
  }

  return (
    <section className="mt-8">
      <h2 className="px-1 text-lg font-bold text-neutral-900">共有メニュー</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <ShareUrlCard
          label="UBMサインアップURL"
          path="/signup/ubm"
          displayUrl={`${origin}/signup/ubm`}
          copied={copiedPath === "/signup/ubm"}
          onCopy={copySignupUrl}
        />
        <ShareUrlCard
          label="一般サインアップURL"
          path="/signup"
          displayUrl={`${origin}/signup`}
          copied={copiedPath === "/signup"}
          onCopy={copySignupUrl}
        />
      </div>
    </section>
  );
}

function ShareUrlCard({ label, path, displayUrl, copied, onCopy }: {
  label: string;
  path: string;
  displayUrl: string;
  copied: boolean;
  onCopy: (path: string) => Promise<void>;
}) {
  return (
    <article className="rounded-3xl bg-white p-6 shadow-sm sm:p-7">
      <h3 className="text-lg font-bold text-neutral-900">{label}</h3>
      <Link href={path} target="_blank" className="mt-3 block break-all text-sm text-blue-700 underline underline-offset-2">
        {displayUrl}
      </Link>
      <button type="button" onClick={() => void onCopy(path)} className="mt-5 w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700">
        {copied ? "コピーしました" : "URLをコピー"}
      </button>
    </article>
  );
}
