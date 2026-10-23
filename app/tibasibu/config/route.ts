import { getConfig } from '@/lib/tibasibu/config';
export const dynamic = 'force-dynamic';
export function GET() {
  try {
    const config = getConfig();
    return Response.json({ configured: Boolean(config), config }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Supabaseの公開接続設定を確認してください。' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
