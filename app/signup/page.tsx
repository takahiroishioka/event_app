"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  return <SignupForm />;
}

export function SignupForm({ ubm = false }: { ubm?: boolean }) {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [redirectPath, setRedirectPath] = useState("/mypage");

  useEffect(() => {
    setRedirectPath(getSignupRedirectPath());
  }, []);

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setIsError(false);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setIsError(true);
      setMessage("お名前を入力してください。");
      return;
    }

    if (!trimmedEmail) {
      setIsError(true);
      setMessage("メールアドレスを入力してください。");
      return;
    }

    if (password.length < 8) {
      setIsError(true);
      setMessage("パスワードは8文字以上で入力してください。");
      return;
    }

    if (password !== passwordConfirm) {
      setIsError(true);
      setMessage("確認用パスワードが一致していません。");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          name: trimmedName,
          signup_type: ubm ? "ubm" : "general",
        },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectPath)}${ubm ? "&signup=ubm" : ""}`,
      },
    });

    if (error) {
      setIsError(true);
      setMessage(`新規登録に失敗しました：${error.message}`);
      setLoading(false);
      return;
    }

    /*
      Supabaseでメール確認が無効の場合は、
      登録時点でsessionが作成されます。
    */
    if (data.session) {
      if (ubm) {
        const { error: roleError } = await supabase.rpc("register_current_user_as_ubm");
        if (roleError) {
          setIsError(true);
          setMessage(`UBM権限を登録できませんでした：${roleError.message}`);
          setLoading(false);
          return;
        }
      }
      router.push(redirectPath);
      router.refresh();
      return;
    }

    /*
      メール確認が有効の場合は、
      確認メールを開いてもらいます。
    */
    setMessage(
      "確認メールを送信しました。メール内のリンクを押して登録を完了してください。"
    );
    setLoading(false);
  }

  async function handleGoogleSignup() {
    setMessage("");
    setIsError(false);
    setLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo:
          `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectPath)}${ubm ? "&signup=ubm" : ""}`,
      },
    });

    if (error) {
      setIsError(true);
      setMessage(`Googleでの登録に失敗しました：${error.message}`);
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl sm:p-10">
        <div className="mb-8 text-center">
          <p className="mb-2 text-sm font-medium text-neutral-500">
            TYPESTYLE EVENT
          </p>

          <h1 className="text-3xl font-bold text-neutral-900">
            {ubm ? "UBM会員新規登録" : "新規登録"}
          </h1>

          <p className="mt-3 text-sm leading-6 text-neutral-500">
            {ubm ? "UBM対象イベント専用のアカウントを作成します" : "アカウントを作成してイベントに参加しましょう"}
          </p>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignup}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-neutral-300 bg-white px-4 py-3 font-medium text-neutral-800 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <GoogleIcon />

          <span>
            {loading ? "処理中..." : "Googleで新規登録"}
          </span>
        </button>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-neutral-200" />

          <span className="text-xs text-neutral-400">
            または
          </span>

          <div className="h-px flex-1 bg-neutral-200" />
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="mb-2 block text-sm font-medium text-neutral-700"
            >
              お名前
            </label>

            <input
              id="name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="しお缶"
              autoComplete="name"
              disabled={loading}
              className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 disabled:bg-neutral-100"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-neutral-700"
            >
              メールアドレス
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="example@email.com"
              autoComplete="email"
              disabled={loading}
              className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 disabled:bg-neutral-100"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-neutral-700"
            >
              パスワード
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="8文字以上で入力"
              autoComplete="new-password"
              disabled={loading}
              className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 disabled:bg-neutral-100"
            />
          </div>

          <div>
            <label
              htmlFor="passwordConfirm"
              className="mb-2 block text-sm font-medium text-neutral-700"
            >
              パスワード確認
            </label>

            <input
              id="passwordConfirm"
              type="password"
              value={passwordConfirm}
              onChange={(event) =>
                setPasswordConfirm(event.target.value)
              }
              placeholder="もう一度入力"
              autoComplete="new-password"
              disabled={loading}
              className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 disabled:bg-neutral-100"
            />
          </div>

          <button
            type="submit"
            disabled={
              loading ||
              !name.trim() ||
              !email.trim() ||
              !password ||
              !passwordConfirm
            }
            className="w-full rounded-xl bg-neutral-900 px-4 py-3 font-bold text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-400"
          >
            {loading
              ? "登録しています..."
              : "メールアドレスで新規登録"}
          </button>
        </form>

        {message && (
          <p
            className={`mt-5 rounded-xl px-4 py-3 text-sm leading-6 ${
              isError
                ? "bg-red-50 text-red-700"
                : "bg-green-50 text-green-700"
            }`}
          >
            {message}
          </p>
        )}

        <p className="mt-7 text-center text-sm text-neutral-500">
          すでにアカウントをお持ちの方は
          <a
            href={`/login?redirect=${encodeURIComponent(redirectPath)}${ubm ? "&signup=ubm" : ""}`}
            className="ml-1 font-bold text-neutral-900 underline underline-offset-4"
          >
            ログイン
          </a>
        </p>
      </div>
    </main>
  );
}

function getSignupRedirectPath() {
  if (typeof window === "undefined") return "/mypage";
  const requestedPath = new URLSearchParams(window.location.search).get("redirect");
  return requestedPath?.startsWith("/") && !requestedPath.startsWith("//") ? requestedPath : "/mypage";
}
function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
    >
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-1.99 3.02v2.54h3.22c1.89-1.74 2.99-4.3 2.99-7.41Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.89 6.61-2.41l-3.22-2.54c-.89.6-2.03.95-3.39.95-2.61 0-4.82-1.76-5.61-4.13H3.06v2.62A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.39 13.87A6 6 0 0 1 6.08 12c0-.65.11-1.28.31-1.87V7.51H3.06A10 10 0 0 0 2 12c0 1.61.38 3.14 1.06 4.49l3.33-2.62Z"
      />
      <path
        fill="#EA4335"
        d="M12 6c1.47 0 2.79.51 3.83 1.51l2.87-2.87C16.96 3.02 14.7 2 12 2a10 10 0 0 0-8.94 5.51l3.33 2.62C7.18 7.76 9.39 6 12 6Z"
      />
    </svg>
  );
}
