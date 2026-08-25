"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";

const menuItems = [
  { href: "/admin", label: "管理画面" },
  { href: "/admin/events", label: "イベント管理" },
  { href: "/admin/participants", label: "参加者管理" },
  { href: "/admin/cancellations", label: "キャンセル申請" },
  { href: "/admin/users", label: "ユーザー一覧" },
  { href: "/admin/top", label: "トップページ" },
  { href: "/admin/footer", label: "フッター" },
  { href: "/admin/banners", label: "バナー" },
];

const subscribeToOrigin = () => () => {};

export default function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const origin = useSyncExternalStore(subscribeToOrigin, () => window.location.origin, () => "");
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  useEffect(() => {
    if (!menuOpen) return;

    function closeMenu(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  async function handleLogout() {
    setLoggingOut(true);
    await createClient().auth.signOut();
    router.replace("/");
    router.refresh();
  }

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
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/admin" className="font-black tracking-tight text-neutral-900">
          管理画面
        </Link>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="管理メニュー"
            aria-expanded={menuOpen}
            aria-controls="admin-navigation"
            className="flex h-11 w-11 flex-col items-center justify-center gap-1.5 rounded-xl border border-neutral-300 bg-white transition hover:bg-neutral-50"
          >
            <span className="h-0.5 w-5 bg-neutral-900" />
            <span className="h-0.5 w-5 bg-neutral-900" />
            <span className="h-0.5 w-5 bg-neutral-900" />
          </button>

          {menuOpen && (
            <nav id="admin-navigation" className="absolute right-0 top-14 max-h-[calc(100vh-5rem)] w-64 overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-2 shadow-xl">
              {menuItems.map((item) => {
                const active = item.href === "/admin"
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`block rounded-xl px-4 py-3 text-sm font-bold transition ${active ? "bg-blue-50 text-blue-700" : "text-neutral-800 hover:bg-neutral-100"}`}
                  >
                    {item.label}
                  </Link>
                );
              })}

              <div className="my-2 border-t border-neutral-200" />
              <Link href="/mypage" onClick={() => setMenuOpen(false)} className="block rounded-xl px-4 py-3 text-sm font-bold text-neutral-800 hover:bg-neutral-100">マイページ</Link>
              <Link href="/" onClick={() => setMenuOpen(false)} className="block rounded-xl px-4 py-3 text-sm font-bold text-neutral-800 hover:bg-neutral-100">TOP</Link>

              <div className="my-2 border-t border-neutral-200" />
              <section className="px-2 py-2">
                <p className="px-2 text-xs font-black tracking-wider text-neutral-500">共有メニュー</p>
                <ShareUrlRow
                  label="UBMサインアップURL"
                  path="/signup/ubm"
                  displayUrl={`${origin}/signup/ubm`}
                  copied={copiedPath === "/signup/ubm"}
                  onCopy={copySignupUrl}
                />
                <ShareUrlRow
                  label="一般サインアップURL"
                  path="/signup"
                  displayUrl={`${origin}/signup`}
                  copied={copiedPath === "/signup"}
                  onCopy={copySignupUrl}
                />
              </section>

              <div className="my-2 border-t border-neutral-200" />
              <button type="button" onClick={handleLogout} disabled={loggingOut} className="block w-full rounded-xl px-4 py-3 text-left text-sm font-bold text-red-600 hover:bg-red-50 disabled:text-neutral-400">
                {loggingOut ? "ログアウト中…" : "ログアウト"}
              </button>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}

function ShareUrlRow({
  label,
  path,
  displayUrl,
  copied,
  onCopy,
}: {
  label: string;
  path: string;
  displayUrl: string;
  copied: boolean;
  onCopy: (path: string) => Promise<void>;
}) {
  return (
    <div className="mt-3 rounded-xl bg-neutral-50 p-3">
      <p className="text-xs font-bold text-neutral-800">{label}</p>
      <Link href={path} target="_blank" className="mt-1 block break-all text-xs text-blue-700 underline underline-offset-2">
        {displayUrl}
      </Link>
      <button
        type="button"
        onClick={() => void onCopy(path)}
        className="mt-2 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-bold text-neutral-800 transition hover:bg-neutral-100"
      >
        {copied ? "コピーしました" : "URLをコピー"}
      </button>
    </div>
  );
}
