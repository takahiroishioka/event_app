import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { confirmationMessage, type Confirmation } from "@/lib/guest-confirmation";

export const runtime = "nodejs";
export const maxDuration = 30;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json = (body: object, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  if (request.headers.get("origin") !== origin) return json({ error: "送信元を確認できません。" }, 403);
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.GUEST_CONFIRMATION_FROM;
  if (!serviceKey || !supabaseUrl || !apiKey || !from) return json({ error: "メール受付の設定を準備中です。主催者へお問い合わせください。" }, 503);
  let input;
  try {
    const body = await request.text();
    if (body.length > 64000) return json({ error: "入力内容が長すぎます。" }, 413);
    input = JSON.parse(body);
  } catch { return json({ error: "入力内容を確認してください。" }, 400); }
  if (!input || typeof input !== "object") return json({ error: "入力内容を確認してください。" }, 400);
  const { eventId, name, email, answers, planId, requestId } = input;
  if (typeof eventId !== "string" || !uuid.test(eventId) || typeof requestId !== "string" || !uuid.test(requestId)
    || typeof name !== "string" || name.trim().length < 1 || name.trim().length > 100
    || typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    || (planId !== null && (typeof planId !== "string" || !uuid.test(planId)))
    || !answers || typeof answers !== "object" || Array.isArray(answers)
    || Object.entries(answers).some(([key, value]) => !uuid.test(key) || !(typeof value === "string" || (Array.isArray(value) && value.every((item) => typeof item === "string"))))) {
    return json({ error: "名前・メールアドレス・回答内容を確認してください。" }, 400);
  }
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const ip = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || "local";
  const requestHash = createHmac("sha256", serviceKey).update(ip).digest("hex");
  const { data, error } = await supabase.rpc("reserve_guest_with_email", {
    p_event_id: eventId, p_guest_name: name.trim(), p_email: email.trim().toLowerCase(), p_answers: answers,
    p_plan_id: planId, p_request_id: requestId, p_request_hash: requestHash,
  });
  if (error || !data) {
    console.error("Guest reservation failed", error?.code);
    return json({ error: error?.code === "P0001" ? error.message : "予約を受け付けられませんでした。時間をおいてお試しください。" }, 400);
  }
  const result = data as { mailId: string; status: string; payload: Confirmation; createdAt: string };
  const response = (mailStatus: string) => json({ registrationId: result.payload.registrationId, reservationStatus: result.payload.reservationStatus, mailStatus });
  if (result.status === "sent") return response("sent");
  // Resend retains idempotency keys for 24 hours. Do not replay older requests automatically.
  if (Date.now() - new Date(result.createdAt).getTime() > 23 * 60 * 60 * 1000) return response("failed");
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://event-app-three-green.vercel.app";
    const message = confirmationMessage(result.payload, siteUrl);
    const sent = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `guest-confirmation/${result.mailId}` },
      body: JSON.stringify({ from, to: [result.payload.email], ...message }), signal: AbortSignal.timeout(10000),
    });
    if (!sent.ok) throw new Error(`Mail provider returned ${sent.status}`);
    const { error: updateError } = await supabase.from("guest_confirmation_emails").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", result.mailId);
    if (updateError) console.error("Confirmation delivery status update failed", updateError.code);
    return response("sent");
  } catch {
    await supabase.from("guest_confirmation_emails").update({ status: "failed" }).eq("id", result.mailId).neq("status", "sent");
    return response("failed");
  }
}
