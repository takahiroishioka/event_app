"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type QuestionType = "text" | "textarea" | "single_choice" | "multiple_choice";
type Option = { option_text: string; sort_order: number };
type Question = { id:string; question_text:string; question_type:QuestionType; is_required:boolean; sort_order:number; event_question_options:Option[] };

const initialOptions = ["", ""];

export default function EventQuestionsPage() {
  const { id } = useParams<{ id: string }>();
  const [eventTitle, setEventTitle] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [type, setType] = useState<QuestionType>("text");
  const [required, setRequired] = useState(false);
  const [options, setOptions] = useState(initialOptions);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [eventResult, questionResult] = await Promise.all([
      supabase.from("events").select("title").eq("id", id).maybeSingle(),
      supabase.from("event_questions").select("id, question_text, question_type, is_required, sort_order, event_question_options(option_text, sort_order)").eq("event_id", id).order("sort_order"),
    ]);
    if (eventResult.error) { setIsError(true); setMessage(`イベントを取得できませんでした：${eventResult.error.message}`); }
    else if (eventResult.data) setEventTitle(eventResult.data.title);
    if (questionResult.error) { setIsError(true); setMessage(`質問を取得できませんでした：${questionResult.error.message}`); }
    else setQuestions((questionResult.data ?? []) as Question[]);
  }, [id]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  const hasOptions = type === "single_choice" || type === "multiple_choice";

  function resetForm() { setEditingId(null); setText(""); setType("text"); setRequired(false); setOptions(initialOptions); }
  function beginEdit(question: Question) {
    setEditingId(question.id); setText(question.question_text); setType(question.question_type); setRequired(question.is_required);
    const values = [...(question.event_question_options ?? [])].sort((a,b) => a.sort_order-b.sort_order).map(item => item.option_text);
    setOptions(values.length >= 2 ? values : initialOptions); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const body = text.trim();
    const validOptions = options.map(value => value.trim()).filter(Boolean);
    if (!body) { setIsError(true); setMessage("質問内容を入力してください。"); return; }
    if (hasOptions && validOptions.length < 2) { setIsError(true); setMessage("選択肢を2つ以上入力してください。"); return; }
    setSaving(true); setMessage(""); setIsError(false);
    const supabase = createClient();
    let questionId = editingId;
    if (editingId) {
      const { error } = await supabase.from("event_questions").update({ question_text:body, question_type:type, is_required:required }).eq("id", editingId);
      if (error) { setIsError(true); setMessage(`質問を更新できませんでした：${error.message}`); setSaving(false); return; }
      const { error: deleteOptionError } = await supabase.from("event_question_options").delete().eq("question_id", editingId);
      if (deleteOptionError) { setIsError(true); setMessage(`選択肢を更新できませんでした：${deleteOptionError.message}`); setSaving(false); return; }
    } else {
      const { data, error } = await supabase.from("event_questions").insert({ event_id:id, question_text:body, question_type:type, is_required:required, sort_order:questions.length+1 }).select("id").single();
      if (error || !data) { setIsError(true); setMessage(`質問を追加できませんでした：${error?.message ?? "不明なエラー"}`); setSaving(false); return; }
      questionId = data.id;
    }
    if (hasOptions && questionId) {
      const { error } = await supabase.from("event_question_options").insert(validOptions.map((option_text,index) => ({ question_id:questionId, option_text, sort_order:index+1 })));
      if (error) { setIsError(true); setMessage(`選択肢を保存できませんでした：${error.message}`); setSaving(false); return; }
    }
    const wasEditing = Boolean(editingId); resetForm(); setMessage(wasEditing ? "質問を更新しました。" : "質問を追加しました。"); await load(); setSaving(false);
  }

  async function remove(question: Question) {
    if (!window.confirm(`「${question.question_text}」を削除しますか？既にある回答も削除されます。`)) return;
    setSaving(true); const { error } = await createClient().from("event_questions").delete().eq("id", question.id);
    setIsError(Boolean(error)); setMessage(error ? `質問を削除できませんでした：${error.message}` : "質問を削除しました。");
    if (!error) { if (editingId === question.id) resetForm(); await load(); } setSaving(false);
  }

  const inputClass = "mt-2 w-full rounded-xl border border-neutral-300 bg-white p-3 font-normal text-neutral-900";
  return <main className="min-h-screen bg-neutral-100 px-4 py-8 sm:px-6"><div className="mx-auto max-w-5xl">
    <Link href={`/admin/events/${id}`} className="text-sm font-bold text-neutral-600 underline">← イベント編集へ戻る</Link>
    <header className="mt-6"><p className="text-sm font-bold text-blue-600">APPLICATION QUESTIONS</p><h1 className="mt-2 text-3xl font-black">質問管理</h1>{eventTitle && <p className="mt-2 text-neutral-500">{eventTitle}</p>}</header>
    {message && <p className={`mt-5 rounded-xl p-4 text-sm ${isError ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>{message}</p>}
    <div className="mt-7 grid gap-6 lg:grid-cols-[420px_1fr]">
      <form onSubmit={submit} className="h-fit rounded-3xl bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">{editingId ? "質問を編集" : "質問を追加"}</h2>
        <label className="mt-5 block text-sm font-bold">質問内容<input value={text} onChange={e=>setText(e.target.value)} className={inputClass}/></label>
        <label className="mt-4 block text-sm font-bold">回答形式<select value={type} onChange={e=>setType(e.target.value as QuestionType)} className={inputClass}><option value="text">一行入力</option><option value="textarea">複数行入力</option><option value="single_choice">単一選択</option><option value="multiple_choice">複数選択</option></select></label>
        <label className="mt-4 flex gap-2 text-sm font-bold"><input type="checkbox" checked={required} onChange={e=>setRequired(e.target.checked)}/>回答を必須にする</label>
        {hasOptions && <div className="mt-4"><p className="text-sm font-bold">選択肢</p>{options.map((option,index)=><div key={index} className="mt-2 flex gap-2"><input value={option} onChange={e=>setOptions(current=>current.map((value,i)=>i===index?e.target.value:value))} placeholder={`選択肢${index+1}`} className="min-w-0 flex-1 rounded-xl border p-3"/><button type="button" disabled={options.length<=2} onClick={()=>setOptions(current=>current.filter((_,i)=>i!==index))} className="rounded-xl border px-3 text-red-600 disabled:opacity-30">削除</button></div>)}<button type="button" onClick={()=>setOptions([...options,""])} className="mt-3 text-sm font-bold text-blue-600">＋ 選択肢を追加</button></div>}
        <button disabled={saving} className="mt-6 w-full rounded-xl bg-blue-600 p-3 font-bold text-white disabled:bg-neutral-300">{saving ? "保存中…" : editingId ? "変更を保存" : "質問を追加する"}</button>{editingId && <button type="button" onClick={resetForm} className="mt-2 w-full rounded-xl border p-3 font-bold">キャンセル</button>}
      </form>
      <section className="rounded-3xl bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">登録済みの質問</h2><div className="mt-5 space-y-3">{questions.map((question,index)=><article key={question.id} className="rounded-xl border p-4"><p className="font-bold">{index+1}. {question.question_text}{question.is_required&&<span className="ml-2 text-xs text-red-600">必須</span>}</p><p className="mt-2 text-xs text-neutral-500">{formatType(question.question_type)}</p>{question.event_question_options?.length>0&&<ul className="mt-2 list-disc pl-5 text-sm text-neutral-600">{[...question.event_question_options].sort((a,b)=>a.sort_order-b.sort_order).map(option=><li key={option.sort_order}>{option.option_text}</li>)}</ul>}<div className="mt-4 flex gap-3"><button onClick={()=>beginEdit(question)} disabled={saving} className="rounded-lg bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">編集</button><button onClick={()=>void remove(question)} disabled={saving} className="rounded-lg bg-red-50 px-4 py-2 text-sm font-bold text-red-700">削除</button></div></article>)}{questions.length===0&&<p className="text-sm text-neutral-500">質問はまだありません。</p>}</div></section>
    </div>
  </div></main>;
}

function formatType(type:QuestionType){return {text:"一行入力",textarea:"複数行入力",single_choice:"単一選択",multiple_choice:"複数選択"}[type]}
