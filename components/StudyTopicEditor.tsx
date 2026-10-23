"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import StudyTopicImageInput from "@/components/StudyTopicImageInput";
const emptyTopic = { title: "", description: "", image_url: "", meeting_format: "", fee: "", is_active: true, sort_order: 0 };
function errorText(cause: unknown) { return cause && typeof cause === "object" && "message" in cause ? String(cause.message) : "通信状態を確認してください。"; }
export default function StudyTopicEditor({ editingId }: { editingId?: string }) {
 const router = useRouter();
 const [form, setForm] = useState(emptyTopic);
 const [imageFile, setImageFile] = useState<File | null>(null);
 const [saving, setSaving] = useState(false);
 const [loading, setLoading] = useState(true);
 const [authorized, setAuthorized] = useState(false);
 const [ready, setReady] = useState(false);
 const [error, setError] = useState("");
 const [message, setMessage] = useState("");
 useEffect(() => {
  let active = true;
  async function load() {
   try {
    const db = createClient();
    const {data:{user},error:authError} = await db.auth.getUser();
    if (authError) throw authError;
    if (!user) { router.replace('/login?redirect=' + encodeURIComponent(editingId ? '/admin/study-requests/' + editingId + '/edit' : '/admin/study-requests/new')); return; }
    const access = await db.rpc('is_global_admin');
    if (access.error) throw access.error;
    if (!access.data) { router.replace('/mypage'); return; }
    if (!active) return;
    setAuthorized(true);
    if (editingId) {
     const {data, error} = await db.from('study_topics').select('id,title,description,image_url,meeting_format,fee,is_active,sort_order').eq('id',editingId).maybeSingle();
     if (error) throw error;
     if (!data) throw new Error('勉強会が見つかりません。');
     if (!active) return;
     setForm({title:data.title,description:data.description ?? '',image_url:data.image_url ?? '',meeting_format:data.meeting_format ?? '',fee:data.fee == null ? '' : String(data.fee),is_active:data.is_active,sort_order:data.sort_order});
    }
    setReady(true);
   } catch(cause) { if(active) setError(errorText(cause)); }
   finally { if(active) setLoading(false); }
  }
  void load(); return () => {active=false;};
 },[editingId,router]);
  async function saveTopic(event: FormEvent) {
    event.preventDefault();
    if (saving || !form.title.trim()) return;
    if (!["zoom", "in_person"].includes(form.meeting_format)) { setError("Zoomまたはリアルを選択してください。"); return; }
    const fee = Number(form.fee);
    if (!form.fee.trim() || !Number.isInteger(fee) || fee < 0 || fee > 2147483647) { setError("金額は0以上の整数で入力してください。"); return; }
    setSaving(true); setError(""); setMessage("");
    try {
      const supabase = createClient();
      let imageUrl = form.image_url || null;
      let uploadedPath: string | null = null;
      if (imageFile) {
        const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
        if (!extensions[imageFile.type] || imageFile.size > 5 * 1024 * 1024) throw new Error("5MB以下のJPEG・PNG・WebP・GIFを選択してください。");
        uploadedPath = `study-topics/${crypto.randomUUID()}.${extensions[imageFile.type]}`;
        const upload = await supabase.storage.from("event-images").upload(uploadedPath, imageFile, { contentType: imageFile.type, upsert: false });
        if (upload.error) throw new Error(`画像をアップロードできませんでした：${upload.error.message}`);
        imageUrl = supabase.storage.from("event-images").getPublicUrl(uploadedPath).data.publicUrl;
      }
      const values = { title: form.title.trim(), description: form.description.trim() || null, image_url: imageUrl, meeting_format: form.meeting_format, fee, is_active: form.is_active, sort_order: form.sort_order, updated_at: new Date().toISOString() };
      const result = editingId ? await supabase.from("study_topics").update(values).eq("id", editingId).select("id").single()
        : await supabase.from("study_topics").insert(values).select("id").single();
      if (result.error) {
        if (uploadedPath) await supabase.storage.from("event-images").remove([uploadedPath]);
        throw result.error;
      }
      router.push("/admin/study-requests?tab=topics");
    } catch (cause) { setError(`保存できませんでした：${errorText(cause)}`); }
    finally { setSaving(false); }
  }


 const inputClass = "mt-2 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-base font-normal text-neutral-900";
 return <main className="min-h-screen bg-neutral-100 px-4 py-8 text-neutral-900 sm:px-6"><div className="mx-auto max-w-4xl">
 <Link href="/admin/study-requests?tab=topics" className="text-sm font-bold text-blue-700 underline">← 勉強会一覧へ</Link>
 <h1 className="mt-6 text-3xl font-bold">{editingId ? "勉強会を編集" : "勉強会を新規登録"}</h1>
 {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
 {message && <p role="status">{message}</p>}
 {loading ? <p className="mt-6">読み込み中…</p> : authorized && ready && (        <form onSubmit={saveTopic} className="mt-6 rounded-3xl bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">{editingId ? "勉強会を編集" : "勉強会を登録"}</h2><fieldset disabled={saving} className="mt-5 space-y-5"><label className="block text-sm font-bold">勉強会名<input required maxLength={150} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className={inputClass} /></label><label className="block text-sm font-bold">説明（一覧では3行まで表示）<textarea rows={12} maxLength={3000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className={inputClass} /></label><label className="block text-sm font-bold">開催形式<select required value={form.meeting_format} onChange={(event) => setForm({ ...form, meeting_format: event.target.value })} className={inputClass}><option value="">選択してください</option><option value="zoom">Zoom</option><option value="in_person">リアル</option></select></label><label className="block text-sm font-bold">金額（円）<input type="number" required min={0} max={2147483647} step={1} value={form.fee} onChange={(event) => setForm({ ...form, fee: event.target.value })} placeholder="無料の場合は0" className={inputClass} /></label><StudyTopicImageInput file={imageFile} imageUrl={form.image_url} onChange={(file) => { setImageFile(file); if (!file) setForm({ ...form, image_url: "" }); }} /><label className="block text-sm font-bold">表示順<input type="number" required step={1} value={form.sort_order} onChange={(event) => setForm({ ...form, sort_order: event.target.valueAsNumber })} className={inputClass} /></label><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} />公開して開催希望を受け付ける</label><button className="w-full rounded-xl bg-blue-600 px-5 py-3 font-bold text-white">{saving ? "保存中…" : "保存する"}</button><Link href="/admin/study-requests?tab=topics" className="block text-center text-sm font-bold text-neutral-500">一覧へ戻る</Link></fieldset></form>
)}
 </div></main>;
}
