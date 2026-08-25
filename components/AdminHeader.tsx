"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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

export default function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

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
