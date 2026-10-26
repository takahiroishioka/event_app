const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(file, dependencies = {}) {
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', output)((name) => dependencies[name] || require(name), module, module.exports);
  return module.exports;
}
const messages = load('lib/guest-confirmation.ts');
const payload = { registrationId: 'receipt', eventId: 'event', name: '参加者', email: 'guest@example.com', title: '勉強会', startAt: '2027-01-01T01:00:00Z', location: 'Zoom', fee: 3000, planName: '通常', reservationStatus: 'reserved' };
test('予約とキャンセル待ち、日時・料金・リンクを区別', () => {
  const message = messages.confirmationMessage(payload, 'https://example.com');
  assert.match(message.text, /10:00/);
  assert.match(message.text, /3,000円/);
  assert.match(message.text, /https:\/\/example.com\/events\/event/);
  assert.match(messages.confirmationMessage({ ...payload, reservationStatus: 'waiting' }, 'https://example.com').text, /参加確定ではありません/);
});
test('APIの送信成功・失敗・再試行・入力拒否', async () => {
  Object.assign(process.env, { SUPABASE_SERVICE_ROLE_KEY: 'test-key', NEXT_PUBLIC_SUPABASE_URL: 'https://example.com', RESEND_API_KEY: 'test-key', GUEST_CONFIRMATION_FROM: 'test@example.com' });
  let status = 'pending';
  let sends = 0;
  let fail = false;
  let calls = 0;
  const db = {
    rpc: async () => { calls++; return { data: { mailId: 'mail', status, payload, createdAt: new Date().toISOString() } }; },
    from: () => ({ update: (value) => ({ eq: () => { status = value.status; return { neq: async () => ({}), then: (resolve) => resolve({}) }; } }) }),
  };
  const { POST } = load('app/api/guest-reservations/route.ts', { '@supabase/supabase-js': { createClient: () => db }, '@/lib/guest-confirmation': messages });
  const originalFetch = global.fetch;
  global.fetch = async (_url, options) => { sends++; assert.equal(options.headers['Idempotency-Key'], 'guest-confirmation/mail'); return { ok: !fail, status: fail ? 500 : 200, json: async () => ({ name: "validation_error" }) }; };
  const uuid = '11111111-1111-4111-8111-111111111111';
  const request = (email = 'guest@example.com', origin = 'https://example.com') => new Request('https://example.com/api/guest-reservations', { method: 'POST', headers: { origin }, body: JSON.stringify({ eventId: uuid, requestId: uuid, name: '参加者', email, planId: null, answers: {} }) });
  try {
    assert.equal((await POST(request('bad'))).status, 400);
    assert.equal((await POST(request(undefined, 'https://other.example'))).status, 403);
    assert.equal(calls, 0);
    fail = true;
    assert.equal((await (await POST(request())).json()).mailStatus, 'failed');
    fail = false;
    assert.equal((await (await POST(request())).json()).mailStatus, 'sent');
    await POST(request());
    assert.equal(sends, 2, '送信済みの再試行ではメールを送らない');
  } finally { global.fetch = originalFetch; }
});
