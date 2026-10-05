"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function VoiceTimelineTabs() {
  const pathname = usePathname();
  const voiceSelected = pathname === "/lines/timeline";
  return <nav aria-label="こえらぼのタイムライン" className="mx-auto flex max-w-6xl gap-1 px-4 sm:px-6">
    {[{ href: "/lines", label: "セリフ", active: !voiceSelected }, { href: "/lines/timeline", label: "声", active: voiceSelected }].map((tab) =>
      <Link key={tab.href} href={tab.href} aria-current={tab.active ? "page" : undefined} className={`min-w-24 border-b-2 px-6 py-3 text-center text-sm font-bold transition ${tab.active ? "border-blue-600 text-blue-700" : "border-transparent text-neutral-500 hover:text-blue-700"}`}>{tab.label}</Link>,
    )}
  </nav>;
}
