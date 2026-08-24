import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/mypage";
  const signupType = requestUrl.searchParams.get("signup");

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=missing_code", requestUrl.origin)
    );
  }

  const supabase = await createClient();

  const { error } =
    await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("認証コード交換エラー:", error);

    return NextResponse.redirect(
      new URL("/login?error=auth_callback_failed", requestUrl.origin)
    );
  }

  if (signupType === "ubm") {
    const { error: roleError } = await supabase.rpc("register_current_user_as_ubm");
    if (roleError) {
      console.error("UBM権限登録エラー:", roleError);
      return NextResponse.redirect(new URL("/login?error=ubm_role_failed", requestUrl.origin));
    }
  }

  return NextResponse.redirect(
    new URL(next, requestUrl.origin)
  );
}
