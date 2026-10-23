const KEY = 'tibasibu-demo-meetings-v1';
const DATABASE = 'tibasibu-demo-files-v1';
const seed = () => [
  { id: 'demo-1', name: '秋の症例検討会', starts_at: '2026-11-14T05:00:00.000Z', status: 'pending', payee: 'ちば支部 事務局' },
  { id: 'demo-2', name: '第3回 基礎から学ぶ勉強会', starts_at: '2026-10-24T09:30:00.000Z', status: 'pending', payee: '講師謝金' },
  { id: 'demo-3', name: '地域連携を考える勉強会', starts_at: '2026-09-19T04:00:00.000Z', status: 'settled', payee: '会場利用料' }
].map((row) => ({ ...row, application: null, report: null, created_at: '2026-10-01T00:00:00.000Z', updated_at: '2026-10-01T00:00:00.000Z' }));

function read() {
  try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : seed(); }
  catch { throw new Error('デモデータを読み込めません。ブラウザーの保存設定を確認してください。'); }
}
async function fileOperation(mode, callback) {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('files');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('PDFのデモ保存領域を開けませんでした。'));
  });
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('files', mode);
      const request = callback(tx.objectStore('files'));
      tx.oncomplete = () => resolve(request.result);
      tx.onabort = tx.onerror = () => reject(new Error('PDFをデモ保存できませんでした。ブラウザーの保存容量を確認してください。'));
    });
  } finally { db.close(); }
}
export class DemoRepository {
  async list() { return read(); }
  async upload(file, meetingId, kind) {
    const path = `${meetingId}/${kind}/${crypto.randomUUID()}.pdf`;
    await fileOperation('readwrite', (store) => store.put(file, path));
    return { path, name: file.name, size: file.size };
  }
  async save(record, previous = null) {
    const rows = read();
    const index = rows.findIndex((row) => row.id === record.id);
    if (previous && (index < 0 || rows[index].updated_at !== previous.updated_at)) throw new Error('別のタブで更新されています。一覧を更新してから編集し直してください。');
    const saved = { ...record, created_at: previous?.created_at || new Date().toISOString(), updated_at: new Date().toISOString() };
    if (index >= 0) rows[index] = saved; else rows.push(saved);
    try { localStorage.setItem(KEY, JSON.stringify(rows)); }
    catch { throw new Error('デモデータを保存できません。ブラウザーの保存設定・容量を確認してください。'); }
    return saved;
  }
  async download(document) {
    const file = await fileOperation('readonly', (store) => store.get(document.path));
    if (!file) throw new Error('デモ用PDFが見つかりません。再度アップロードしてください。');
    return file;
  }
}
