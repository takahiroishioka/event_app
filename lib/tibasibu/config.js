export function getConfig(env = process.env) {
  const url = (env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const key = (env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || '').trim();
  if (!url || !key) return null;
  let parsed;
  try { parsed = new URL(url); } catch { throw new Error('SUPABASE_URLの形式を確認してください。'); }
  if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.supabase.co') || parsed.pathname !== '/' || parsed.search || parsed.hash || parsed.username || parsed.password || parsed.port) {
    throw new Error('SUPABASE_URLには https://プロジェクトID.supabase.co を設定してください。');
  }
  if (!key.startsWith('sb_publishable_')) {
    let payload;
    try { payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()); } catch { /* Invalid key. */ }
    if (!payload || payload.role !== 'anon' || key.split('.').length !== 3) {
      throw new Error('Publishable key、または旧anon keyを設定してください。管理者キーは使用できません。');
    }
  }
  return { url, key };
}

