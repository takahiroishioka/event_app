import type { SupabaseClient } from "@supabase/supabase-js";

export const maxVoiceFileSize = 20 * 1024 * 1024;
const formats: Record<string, string> = {
  mp3: "audio/mpeg", m4a: "audio/mp4", mp4: "audio/mp4",
  wav: "audio/wav", webm: "audio/webm", ogg: "audio/ogg", oga: "audio/ogg",
};
const mimeExtensions: Record<string, string> = {
  "audio/mpeg": "mp3", "audio/mp3": "mp3", "audio/mp4": "m4a", "audio/x-m4a": "m4a",
  "audio/wav": "wav", "audio/x-wav": "wav", "audio/wave": "wav", "audio/vnd.wave": "wav",
  "audio/webm": "webm", "audio/ogg": "ogg",
};

export function voiceFileFormat(file: { name: string; type: string; size: number }) {
  if (!file.size) throw new Error("音声ファイルが空です。別のファイルを選んでください。");
  if (file.size > maxVoiceFileSize) throw new Error("音声ファイルは20MB以下にしてください。");
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const mime = file.type.toLowerCase().split(";")[0].trim();
  const resolved = formats[extension] ? extension : mimeExtensions[mime];
  if (!resolved) throw new Error("MP3・M4A・WAV・WebM・OGG形式の音声を選んでください。");
  return { extension: resolved, contentType: formats[resolved] };
}

function detail(error: unknown): string {
  return error && typeof error === "object" && "message" in error ? String(error.message) : "通信状態を確認してください。";
}

export async function uploadVoicePost(supabase: SupabaseClient, lineId: string, file: File, note: string) {
  const format = voiceFileFormat(file);
  const auth = await supabase.auth.getUser();
  if (auth.error || !auth.data.user) throw new Error("ログイン状態を確認できません。ログインし直してから投稿してください。");
  const userId = auth.data.user.id;
  const path = `${userId}/${crypto.randomUUID()}.${format.extension}`;
  const storage = supabase.storage.from("voice-recordings");
  let upload;
  try { upload = await storage.upload(path, file, { contentType: format.contentType, upsert: false }); }
  catch (error) { throw new Error(`音声をアップロードできませんでした：${detail(error)}`); }
  if (upload.error) throw new Error(`音声をアップロードできませんでした：${detail(upload.error)}`);
  const audioUrl = storage.getPublicUrl(path).data.publicUrl;
  let result;
  try {
    result = await supabase.from("voice_posts").insert({ line_id: lineId, user_id: userId, audio_url: audioUrl, storage_path: path, note: note.trim() || null });
  } catch (error) {
    // The request may have committed before the connection failed; keep its audio.
    throw new Error(`投稿結果を確認できませんでした。ページを再読み込みして投稿の有無を確認してください：${detail(error)}`);
  }
  if (result.error) {
    try { await storage.remove([path]); } catch { /* Do not replace the original failure. */ }
    throw new Error(`投稿を保存できませんでした：${detail(result.error)}`);
  }
}
