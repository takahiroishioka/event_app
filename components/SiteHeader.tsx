"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SiteHeader({ siteName = "TYPESTYLE EVENT" }: { siteName?: string }) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [savedSiteName, setSavedSiteName] = useState<string | null>(null);
  const [siteNameLoaded, setSiteNameLoaded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (active) setIsLoggedIn(Boolean(data.session));
    });

    void supabase
      .from("top_page_settings")
      .select("site_name")
      .eq("id", true)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        if (data?.site_name) setSavedSiteName(data.site_name);
        setSiteNameLoaded(true);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setIsLoggedIn(Boolean(session));
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

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
    setMenuOpen(false);
    router.replace("/");
    router.refresh();
  }

  return (
    <header className="relative z-50 border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/" className="text-lg font-black tracking-tight text-neutral-900">
          <span className={siteNameLoaded ? undefined : "invisible"}>
            {savedSiteName ?? siteName}
          </span>
        </Link>

        {isLoggedIn === false && (
          <div className="flex items-center gap-3"><Link href="/lines" className="text-sm font-bold text-blue-700">こえらぼ</Link><Link href="/login" className="rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-neutral-700">ログイン</Link></div>
        )}

        {isLoggedIn && (
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="メニュー"
              aria-expanded={menuOpen}
              className="flex h-11 w-11 flex-col items-center justify-center gap-1.5 rounded-xl border border-neutral-300 bg-white transition hover:bg-neutral-50"
            >
              <span className="h-0.5 w-5 bg-neutral-900" />
              <span className="h-0.5 w-5 bg-neutral-900" />
              <span className="h-0.5 w-5 bg-neutral-900" />
            </button>

            {menuOpen && (
              <nav className="absolute right-0 top-14 w-52 overflow-hidden rounded-2xl border border-neutral-200 bg-white p-2 shadow-xl">
                <Link href="/" onClick={() => setMenuOpen(false)} className="block rounded-xl px-4 py-3 text-sm font-bold text-neutral-800 hover:bg-neutral-100">TOP</Link>
                <Link href="/lines" onClick={() => setMenuOpen(false)} className="block rounded-xl px-4 py-3 text-sm font-bold text-neutral-800 hover:bg-neutral-100">こえらぼ</Link>
                <Link href="/mypage" onClick={() => setMenuOpen(false)} className="block rounded-xl px-4 py-3 text-sm font-bold text-neutral-800 hover:bg-neutral-100">マイページ</Link>
                <button type="button" onClick={handleLogout} disabled={loggingOut} className="block w-full rounded-xl px-4 py-3 text-left text-sm font-bold text-red-600 hover:bg-red-50 disabled:text-neutral-400">
                  {loggingOut ? "ログアウト中…" : "ログアウト"}
                </button>
              </nav>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
