import Link from "next/link";
import AdminImageManager from "@/components/AdminImageManager";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export default async function ServiceAdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/admin/service");
  const { data: isAdmin, error } = await supabase.rpc("is_global_admin");
  if (error || !isAdmin) redirect("/mypage");
  return <main className="min-h-screen px-4 py-8 text-neutral-900"><div className="mx-auto max-w-6xl"><Link href="/admin/top" className="font-bold text-blue-700 underline">← トップページ管理</Link><h1 className="my-6 text-3xl font-bold">受託LPの制作実績</h1><p className="mb-6 text-sm leading-7">サイトのサムネイルを追加し、サイト名・リンク先URLを入力して「設定を保存」を押してください。公開中の画像を小さい表示順からLPに掲載します。</p><AdminImageManager placement="service_work" /><div className="mt-6"><AdminImageManager placement="service_sns" /></div><Link href="/event-app-service#works" className="mt-6 inline-block font-bold text-blue-700 underline">LPの制作実績を見る →</Link></div></main>;
}
