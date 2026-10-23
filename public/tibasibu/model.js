export const MAX_PDF_SIZE = 10 * 1024 * 1024;
export const BUCKET = 'tibasibu-documents';
export const COLUMNS = 'id,name,starts_at,status,payee,application,report,created_at,updated_at';

export function toJapanISO(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) throw new Error('開催日と開始時刻を入力してください。');
  if (date < '2000-01-01' || date > '2100-12-31') throw new Error('開催日は2000〜2100年で指定してください。');
  const result = new Date(`${date}T${time}:00+09:00`);
  if (!Number.isFinite(result.getTime()) || japanParts(result.toISOString()).date !== date || japanParts(result.toISOString()).time !== time) {
    throw new Error('正しい開催日時を入力してください。');
  }
  return result.toISOString();
}

export function japanParts(iso) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(iso));
  const get = (name) => parts.find((part) => part.type === name).value;
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` };
}

export function formatMeetingDate(iso) {
  return new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));
}

export function validateMeeting(input) {
  const name = String(input.name || '').trim();
  const payee = String(input.payee || '').trim();
  if (!name || name.length > 200) throw new Error('勉強会名は1〜200文字で入力してください。');
  if (payee.length > 300) throw new Error('清算先は300文字以内で入力してください。');
  if (!['pending', 'settled'].includes(input.status)) throw new Error('清算ステータスを選択してください。');
  return { name, starts_at: toJapanISO(input.date, input.time), status: input.status, payee };
}

export async function validatePDF(file) {
  if (!file) return;
  if (!/\.pdf$/i.test(file.name)) throw new Error('添付できるのはPDFファイルのみです。');
  if (file.size > MAX_PDF_SIZE) throw new Error('PDFファイルは各10MBまでです。');
  if (file.size < 5 || new TextDecoder().decode(await file.slice(0, 5).arrayBuffer()) !== '%PDF-') throw new Error('PDFの内容を確認できません。正しいPDFファイルを選択してください。');
  if (file.name.length > 255) throw new Error('PDFのファイル名は255文字以内にしてください。');
}

export function selectMeetings(rows, { filter = 'all', search = '', sort = 'desc' } = {}) {
  const term = search.trim().normalize('NFKC').toLocaleLowerCase('ja-JP');
  return rows.filter((row) => (filter === 'all' || row.status === filter) && `${row.name} ${row.payee}`.normalize('NFKC').toLocaleLowerCase('ja-JP').includes(term))
    .sort((a, b) => (sort === 'asc' ? 1 : -1) * (a.starts_at.localeCompare(b.starts_at) || a.id.localeCompare(b.id)));
}

export class SupabaseRepository {
  constructor(config, fetcher = (input, init) => globalThis.fetch(input, init)) { this.config = config; this.fetcher = fetcher; }
  headers(extra = {}) {
    const headers = { apikey: this.config.key, ...extra };
    if (!this.config.key.startsWith('sb_publishable_')) headers.Authorization = `Bearer ${this.config.key}`;
    return headers;
  }
  async request(path, options = {}) {
    let response;
    try { response = await this.fetcher(`${this.config.url}${path}`, { ...options, headers: this.headers(options.headers), signal: AbortSignal.timeout(60000) }); }
    catch { throw new Error('通信できませんでした。接続状況を確認して再度お試しください。保存中だった場合は、一覧を更新して登録結果を確認してください。'); }
    if (!response.ok) {
      if (response.status === 409) throw new Error('保存内容が競合しました。一覧を更新してから再度お試しください。');
      if (response.status === 413) throw new Error('PDFファイルは各10MBまでです。');
      if (response.status === 401 || response.status === 403) throw new Error('Supabaseの接続設定・公開キー・アクセス権限を確認してください。');
      throw new Error(`保存先でエラーが発生しました（${response.status}）。Supabaseでsetup.sqlを実行済みか確認してください。`);
    }
    return response;
  }
  async list() {
    const rows = [];
    for (let offset = 0; ; offset += 500) {
      const response = await this.request(`/rest/v1/tibasibu_meetings?select=${COLUMNS}&order=starts_at.desc,id.asc&limit=500&offset=${offset}`, { cache: 'no-store' });
      const batch = await response.json();
      if (!Array.isArray(batch)) throw new Error('一覧の取得結果を確認できませんでした。');
      rows.push(...batch);
      if (batch.length < 500) break;
    }
    return rows;
  }
  async upload(file, meetingId, kind) {
    await validatePDF(file);
    const path = `${meetingId}/${kind}/${crypto.randomUUID()}.pdf`;
    await this.request(`/storage/v1/object/${BUCKET}/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/pdf', 'x-upsert': 'false' }, body: file });
    return { path, name: file.name, size: file.size };
  }
  async save(record, previous = null) {
    let path = '/rest/v1/tibasibu_meetings';
    if (previous) path += `?id=eq.${encodeURIComponent(record.id)}&updated_at=eq.${encodeURIComponent(previous.updated_at)}`;
    const payload = { ...record };
    if (previous) delete payload.id;
    const response = await this.request(path, { method: previous ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(payload) });
    const rows = await response.json();
    if (!rows.length) throw new Error('ほかの人がこの勉強会を更新しました。入力内容を控え、画面を閉じて一覧を更新してから編集し直してください。');
    return rows[0];
  }
  async download(document) {
    const path = document.path.split('/').map(encodeURIComponent).join('/');
    const response = await this.request(`/storage/v1/object/public/${BUCKET}/${path}`);
    return response.blob();
  }
}
