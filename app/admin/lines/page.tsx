"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Row = { id:string; title:string; body:string; direction:string|null; creator_comment:string|null; category:string|null; image_url:string|null; image_storage_path:string|null; status:"draft"|"published"; published_at:string|null };
const empty = { title:"", body:"", direction:"", creator_comment:"", category:"", status:"draft" as "draft"|"published" };

export default function AdminLinesPage() {
  const [rows,setRows]=useState<Row[]>([]), [form,setForm]=useState(empty);
  const [image,setImage]=useState<File|null>(null), [editing,setEditing]=useState<Row|null>(null);
  const [message,setMessage]=useState(""), [busy,setBusy]=useState(false), [replacingId,setReplacingId]=useState<string|null>(null);

  async function load(){ const {data,error}=await createClient().from("voice_lines").select("*").order("created_at",{ascending:false}); if(error)setMessage(`一覧を取得できません：${error.message}`); else setRows((data??[]) as Row[]); }
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(()=>{void load()},[]);

  async function uploadImage(file:File){
    const s=createClient(), ext=file.name.split(".").pop()?.toLowerCase()||"jpg", path=`lines/${crypto.randomUUID()}.${ext}`;
    const result=await s.storage.from("voice-line-images").upload(path,file,{contentType:file.type,upsert:false});
    if(result.error) throw result.error;
    return {path,url:s.storage.from("voice-line-images").getPublicUrl(path).data.publicUrl};
  }

  async function save(e:FormEvent){
    e.preventDefault(); setBusy(true); setMessage(""); const s=createClient();
    let image_url=editing?.image_url??null, image_storage_path=editing?.image_storage_path??null, uploaded:string|null=null;
    try {
      if(image){ const next=await uploadImage(image); image_url=next.url; image_storage_path=next.path; uploaded=next.path; }
      const values={...form,title:form.title.trim(),body:form.body.trim(),direction:form.direction.trim()||null,creator_comment:form.creator_comment.trim()||null,category:form.category.trim()||null,image_url,image_storage_path,published_at:form.status==="published"?(editing?.published_at??new Date().toISOString()):null,updated_at:new Date().toISOString()};
      const {error}=editing?await s.from("voice_lines").update(values).eq("id",editing.id):await s.from("voice_lines").insert(values);
      if(error){ if(uploaded)await s.storage.from("voice-line-images").remove([uploaded]); throw error; }
      if(image&&editing?.image_storage_path)await s.storage.from("voice-line-images").remove([editing.image_storage_path]);
      setMessage("保存しました。"); setEditing(null); setForm(empty); setImage(null); await load();
    } catch(error){ setMessage(error instanceof Error?error.message:"保存できませんでした。"); }
    setBusy(false);
  }

  async function replaceImage(row:Row,file:File){
    setReplacingId(row.id); setMessage(""); const s=createClient(); let uploaded:string|null=null;
    try { const next=await uploadImage(file); uploaded=next.path; const {error}=await s.from("voice_lines").update({image_url:next.url,image_storage_path:next.path,updated_at:new Date().toISOString()}).eq("id",row.id); if(error){await s.storage.from("voice-line-images").remove([next.path]);throw error;} if(row.image_storage_path)await s.storage.from("voice-line-images").remove([row.image_storage_path]); setMessage("画像を差し替えました。"); await load(); }
    catch(error){if(uploaded)await s.storage.from("voice-line-images").remove([uploaded]);setMessage(error instanceof Error?error.message:"画像を差し替えできませんでした。");}
    setReplacingId(null);
  }

  async function remove(row:Row){ if(!confirm("このセリフと紐づく音声・コメントを削除しますか？"))return; const s=createClient(),{error}=await s.from("voice_lines").delete().eq("id",row.id); if(!error&&row.image_storage_path)await s.storage.from("voice-line-images").remove([row.image_storage_path]); setMessage(error?.message??"削除しました。"); if(!error)await load(); }
  function edit(row:Row){setEditing(row);setForm({title:row.title,body:row.body,direction:row.direction??"",creator_comment:row.creator_comment??"",category:row.category??"",status:row.status});setImage(null)}

  return <main className="min-h-screen bg-neutral-100 px-4 py-10"><div className="mx-auto max-w-6xl"><p className="text-sm font-bold text-blue-600">KOELABO</p><h1 className="mt-2 text-3xl font-black">セリフ管理</h1>{message&&<p className="mt-4 rounded-xl bg-white p-4 text-sm">{message}</p>}<div className="mt-8 grid gap-6 lg:grid-cols-[420px_1fr]">
    <form onSubmit={save} className="h-fit rounded-3xl bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">{editing?"セリフ編集":"新規セリフ"}</h2><label className="mt-5 block text-sm font-bold">画像<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e=>setImage(e.target.files?.[0]??null)} className="mt-2 block w-full text-sm"/></label>{(image||editing?.image_url)&&<div className="mt-3 aspect-video overflow-hidden rounded-xl bg-neutral-100"><img src={image?URL.createObjectURL(image):editing?.image_url??""} alt="プレビュー" className="h-full w-full object-cover"/></div>}<label className="mt-4 block text-sm font-bold">タイトル<input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})} className="mt-2 w-full rounded-xl border p-3"/></label><label className="mt-4 block text-sm font-bold">セリフ<textarea required value={form.body} onChange={e=>setForm({...form,body:e.target.value})} rows={5} className="mt-2 w-full rounded-xl border p-3"/></label><label className="mt-4 block text-sm font-bold">演技メモ<textarea value={form.direction} onChange={e=>setForm({...form,direction:e.target.value})} rows={3} className="mt-2 w-full rounded-xl border p-3"/></label><label className="mt-4 block text-sm font-bold">作者コメント<textarea value={form.creator_comment} onChange={e=>setForm({...form,creator_comment:e.target.value})} rows={4} placeholder="このセリフについて伝えたいこと" className="mt-2 w-full rounded-xl border p-3"/></label><label className="mt-4 block text-sm font-bold">カテゴリー<input value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className="mt-2 w-full rounded-xl border p-3"/></label><label className="mt-4 block text-sm font-bold">公開状態<select value={form.status} onChange={e=>setForm({...form,status:e.target.value as "draft"|"published"})} className="mt-2 w-full rounded-xl border p-3"><option value="draft">下書き</option><option value="published">公開</option></select></label><button disabled={busy} className="mt-6 w-full rounded-xl bg-blue-600 p-3 font-bold text-white disabled:bg-neutral-300">{busy?"保存中…":"保存する"}</button>{editing&&<button type="button" onClick={()=>{setEditing(null);setForm(empty);setImage(null)}} className="mt-2 w-full rounded-xl border p-3">キャンセル</button>}</form>
    <div className="space-y-4">{rows.map(row=><article key={row.id} className="rounded-2xl bg-white p-5 shadow-sm"><Link href={row.status==="published"?`/lines/${row.id}`:"#"} onClick={e=>{if(row.status!=="published")e.preventDefault()}} className={`flex gap-4 rounded-xl ${row.status==="published"?"transition hover:bg-neutral-50":"cursor-default"}`}>{row.image_url?<img src={row.image_url} alt="" className="h-24 w-32 rounded-xl object-cover"/>:<div className="h-24 w-32 rounded-xl bg-blue-50"/>}<div className="min-w-0 flex-1"><span className="text-xs font-bold text-blue-700">{row.status==="published"?"公開":"下書き"}</span><h2 className="mt-2 font-bold">{row.title}</h2><p className="line-clamp-2 whitespace-pre-wrap text-sm text-neutral-600">{row.body}</p>{row.status==="published"&&<p className="mt-2 text-xs font-bold text-blue-600">セリフページを見る →</p>}</div></Link><div className="mt-4 flex flex-wrap gap-2"><label className="cursor-pointer rounded-xl bg-violet-50 px-4 py-2 text-sm font-bold text-violet-700">{replacingId===row.id?"差し替え中…":"画像だけ差し替え"}<input disabled={Boolean(replacingId)} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={e=>{const file=e.target.files?.[0];if(file)void replaceImage(row,file);e.target.value=""}}/></label><button onClick={()=>edit(row)} className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">内容を編集</button><button onClick={()=>remove(row)} className="rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-700">削除</button></div></article>)}</div>
  </div></div></main>;
}


