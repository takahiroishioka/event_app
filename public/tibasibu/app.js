import { SupabaseRepository, validateMeeting, validatePDF, japanParts, formatMeetingDate, selectMeetings } from './model.js';
const APP_BASE = new URL('.', import.meta.url).pathname;
const $ = (selector) => document.querySelector(selector);
const state = { rows: [], repository: null, filter: 'all', editing: null, busy: false, loaded: false, loadError: false, loadVersion: 0, demo: new URLSearchParams(location.search).get('demo') === '1' };
const dialog = $('#editor');
let toastTimer;
const element = (tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; };
const icon = (name) => { const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.classList.add('icon'); svg.setAttribute('aria-hidden', 'true'); const use = document.createElementNS(svg.namespaceURI, 'use'); use.setAttribute('href', `#i-${name}`); svg.append(use); return svg; };
function toast(message) { clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').hidden = false; toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 5000); }
function showError(error) { $('#global-error').textContent = error.message || '処理できませんでした。再度お試しください。'; $('#global-error').hidden = false; }
function setBanner(text, linkText, href) { const banner = $('#mode-banner'); banner.replaceChildren(document.createTextNode(text)); if (linkText) { const link = element('a', '', linkText); link.href = href; banner.append(' ', link); } banner.hidden = false; }
function render() {
  const rows = selectMeetings(state.rows, { filter: state.filter, search: $('#search').value, sort: $('#sort').value });
  $('#stat-total').textContent = state.loaded ? state.rows.length : '—';
  $('#stat-pending').textContent = state.loaded ? state.rows.filter((row) => row.status === 'pending').length : '—';
  $('#stat-settled').textContent = state.loaded ? state.rows.filter((row) => row.status === 'settled').length : '—';
  $('#nav-count').textContent = state.loaded ? state.rows.length : '—';
  $('#result-count').textContent = rows.length;
  $('#list-summary').textContent = state.loaded ? `${state.rows.length}件中 ${rows.length}件を表示` : '接続待ち';
  $('#meetings').replaceChildren(...rows.map(renderRow));
  $('#empty-state').hidden = rows.length > 0;
  if (!rows.length) {
    const configured = Boolean(state.repository);
    const empty = state.loaded && !state.rows.length;
    $('#empty-title').textContent = state.loadError ? '一覧を取得できませんでした' : !configured ? '共有データベースの接続待ちです' : empty ? 'まだ勉強会が登録されていません' : state.loaded ? '条件に合う勉強会がありません' : '読み込み中…';
    $('#empty-text').textContent = state.loadError ? '上のエラー内容をご確認のうえ、更新ボタンから再度お試しください。' : !configured ? 'Supabaseの接続設定をすると、ここに勉強会が表示されます。デモモードでは画面の操作をお試しいただけます。' : empty ? '最初の勉強会を登録して、開催情報や書類をまとめましょう。' : state.loaded ? '検索キーワードや清算状況の絞り込みを変更してください。' : '勉強会の情報を取得しています。';
    $('#empty-action').hidden = !empty;
  }
}
function renderRow(row) {
  const tr = element('tr');
  const nameCell = element('td');
  const name = element('p', 'meeting-name', row.name);
  const date = element('div', 'meeting-date'); date.append(icon('calendar'), document.createTextNode(formatMeetingDate(row.starts_at)));
  nameCell.append(name, date); tr.append(nameCell);
  for (const kind of ['application', 'report']) {
    const td = element('td'); td.dataset.label = kind === 'application' ? '申請書' : '報告書';
    if (row[kind]) {
      const button = element('button', 'pdf-button'); button.type = 'button'; button.append(icon('download'), 'PDF');
      button.setAttribute('aria-label', `${row.name}の${kind === 'application' ? '申請書' : '報告書'}をダウンロード`);
      button.title = row[kind].name;
      button.addEventListener('click', () => download(row[kind], button)); td.append(button);
    } else td.append(element('span', 'missing', '未登録'));
    tr.append(td);
  }
  const statusCell = element('td'); statusCell.dataset.label = '清算状況';
  const badge = element('span', `badge ${row.status}`); badge.append(icon(row.status === 'settled' ? 'check' : 'clock'), row.status === 'settled' ? '清算済み' : '未清算'); statusCell.append(badge); tr.append(statusCell);
  const payeeCell = element('td', 'payee', row.payee || '—'); payeeCell.dataset.label = '清算先'; tr.append(payeeCell);
  const editCell = element('td'); const edit = element('button', 'icon-button'); edit.type = 'button'; edit.append(icon('edit')); edit.setAttribute('aria-label', `${row.name}を編集`); edit.addEventListener('click', () => openEditor(row)); editCell.append(edit); tr.append(editCell);
  return tr;
}
async function download(documentInfo, button) {
  button.disabled = true;
  try {
    const blob = await state.repository.download(documentInfo);
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = documentInfo.name; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (error) { showError(error); }
  finally { button.disabled = false; }
}
async function refresh() {
  if (!state.repository) return;
  const version = ++state.loadVersion;
  $('#refresh').disabled = true; $('#table-wrap').setAttribute('aria-busy', 'true'); $('#global-error').hidden = true;
  try { const rows = await state.repository.list(); if (version !== state.loadVersion) return; state.rows = rows; state.loaded = true; state.loadError = false; }
  catch (error) { state.loadError = true; showError(error); }
  finally { if (version === state.loadVersion) { $('#refresh').disabled = false; $('#table-wrap').setAttribute('aria-busy', 'false'); render(); } }
}
function openEditor(row = null) {
  if (!state.repository || state.busy) return;
  state.editing = row; state.draftId = row?.id || crypto.randomUUID();
  $('#meeting-form').reset(); $('#form-error').hidden = true;
  $('#editor-title').textContent = row ? '勉強会を編集' : '勉強会を登録';
  $('#save-meeting').textContent = row ? '変更を保存' : '登録する';
  $('#save-note').textContent = state.demo ? 'デモ：このブラウザーだけに保存' : '登録内容は全員に共有されます';
  if (row) {
    const parts = japanParts(row.starts_at);
    $('#meeting-name').value = row.name; $('#meeting-date').value = parts.date; $('#meeting-time').value = parts.time; $('#meeting-status').value = row.status; $('#meeting-payee').value = row.payee;
  }
  for (const kind of ['application', 'report']) $(`#${kind}-current`).textContent = row?.[kind] ? `登録済み：${row[kind].name}` : 'PDFを選択（任意）';
  dialog.showModal(); $('#meeting-name').focus();
}
function closeEditor() { if (!state.busy) dialog.close(); }
function setBusy(busy) {
  state.busy = busy;
  for (const control of $('#meeting-form').querySelectorAll('button,input,select')) control.disabled = busy;
  $('#save-meeting').textContent = busy ? '保存中…' : state.editing ? '変更を保存' : '登録する';
  $('#meeting-form').setAttribute('aria-busy', String(busy));
}
$('#meeting-form').addEventListener('submit', async (event) => {
  event.preventDefault(); if (state.busy) return;
  $('#form-error').hidden = true;
  const previous = state.editing;
  const files = { application: $('#application-file').files[0], report: $('#report-file').files[0] };
  setBusy(true);
  try {
    const data = validateMeeting({ name: $('#meeting-name').value, date: $('#meeting-date').value, time: $('#meeting-time').value, status: $('#meeting-status').value, payee: $('#meeting-payee').value });
    // Validate both before uploading either document.
    await Promise.all(Object.values(files).map(validatePDF));
    const record = { id: state.draftId, ...data, application: previous?.application || null, report: previous?.report || null };
    // Keep successfully uploaded documents for a retry if saving the row fails.
    for (const kind of ['application', 'report']) if (files[kind]) {
      const cached = files[kind]._uploaded;
      record[kind] = cached?.meetingId === record.id ? cached.document : await state.repository.upload(files[kind], record.id, kind);
      files[kind]._uploaded = { meetingId: record.id, document: record[kind] };
    }
    const saved = await state.repository.save(record, previous);
    const index = state.rows.findIndex((row) => row.id === saved.id);
    if (index >= 0) state.rows[index] = saved; else state.rows.push(saved);
    state.loaded = true; state.loadError = false; $('#global-error').hidden = true;
    // Reveal newly saved data even when an old filter would hide it.
    state.filter = 'all'; $('#search').value = ''; updateFilterButtons(); render();
    dialog.close(); toast(previous ? '勉強会の変更を保存しました' : '勉強会を登録しました');
  } catch (error) { $('#form-error').textContent = error.message; $('#form-error').hidden = false; $('#form-error').scrollIntoView({ block: 'nearest' }); }
  finally { setBusy(false); }
});
function updateFilterButtons() { for (const button of document.querySelectorAll('[data-filter]')) button.setAttribute('aria-pressed', String(button.dataset.filter === state.filter)); }
for (const button of document.querySelectorAll('[data-filter]')) button.addEventListener('click', () => { state.filter = button.dataset.filter; updateFilterButtons(); render(); });
for (const kind of ['application', 'report']) $(`#${kind}-file`).addEventListener('change', () => { const file = $(`#${kind}-file`).files[0]; $(`#${kind}-current`).textContent = file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)}MB` : state.editing?.[kind] ? `登録済み：${state.editing[kind].name}` : 'PDFを選択（任意）'; });
$('#new-meeting').addEventListener('click', () => openEditor()); $('#empty-action').addEventListener('click', () => openEditor());
$('#close-editor').addEventListener('click', closeEditor); $('#cancel-editor').addEventListener('click', closeEditor);
dialog.addEventListener('cancel', (event) => { if (state.busy) event.preventDefault(); });
$('#search').addEventListener('input', render); $('#sort').addEventListener('change', render); $('#refresh').addEventListener('click', refresh);
window.addEventListener('beforeunload', (event) => { if (state.busy) { event.preventDefault(); event.returnValue = ''; } });
window.addEventListener('storage', (event) => { if (state.demo && event.key === 'tibasibu-demo-meetings-v1' && !state.busy && !dialog.open) refresh(); });
async function init() {
  try {
    if (state.demo) {
      const { DemoRepository } = await import('./demo.js'); state.repository = new DemoRepository();
      setBanner('デモモード：サンプルを含むデータとPDFは、このブラウザーだけに保存されます。ほかの人には共有されません。', '共有ページに戻る', APP_BASE);
    } else {
      const response = await fetch(`${APP_BASE}config`, { cache: 'no-store' });
      if (!response.ok) { const detail = await response.json().catch(() => ({})); throw new Error(detail.error || '接続設定を取得できません。ページを再読み込みしてください。'); }
      const result = await response.json();
      if (result.configured) state.repository = new SupabaseRepository(result.config);
      else setBanner('共有データベースは未接続です。READMEの手順でSupabase・環境変数を設定してください。', 'デモを試す', APP_BASE + '?demo=1');
    }
    if (state.repository) { $('#new-meeting').disabled = false; await refresh(); }
    else { render(); $('#table-wrap').setAttribute('aria-busy', 'false'); }
  } catch (error) { showError(error); state.loadError = true; render(); $('#table-wrap').setAttribute('aria-busy', 'false'); }
}
init();
