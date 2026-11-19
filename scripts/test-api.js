// TICKETFLOW API 테스트 스크립트
// 사용법: node scripts/test-api.js [서버주소]   (기본값: http://localhost:3001)
// - .env의 ADMIN_API_KEY를 사용하며, 결과 화면/보고서에는 키를 마스킹해서 표시합니다.
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const BASE = (process.argv[2] || 'http://localhost:3001').replace(/\/$/, '');
const KEY = process.env.ADMIN_API_KEY || '';
const MASKED = KEY ? KEY.slice(0, 4) + '****' : '(없음)';

const results = [];

async function call(label, method, urlPath, { body, admin = false } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (admin) headers['x-admin-key'] = KEY;
  const started = Date.now();
  const res = await fetch(BASE + urlPath, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  const shownHeaders = { ...headers };
  if (shownHeaders['x-admin-key']) shownHeaders['x-admin-key'] = MASKED;
  const item = { label, method, url: BASE + urlPath, headers: shownHeaders, body, status: res.status, ms: Date.now() - started, response: json };
  results.push(item);
  console.log(`\n[${label}] ${method} ${BASE + urlPath} -> ${res.status} (${item.ms}ms)`);
  console.log(JSON.stringify(json, null, 2));
  return item;
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function writeReport() {
  const cards = results.map((r, i) => `
  <section class="card" id="t${i + 1}">
    <div class="head"><span class="m ${r.method}">${r.method}</span><span class="u">${esc(r.url)}</span>
      <span class="s ${r.status < 300 ? 'ok' : 'err'}">${r.status}</span><span class="ms">${r.ms} ms</span></div>
    <div class="label">${esc(r.label)}</div>
    <div class="grid">
      <div><h4>Request Headers</h4><pre>${esc(JSON.stringify(r.headers, null, 2))}</pre>
           <h4>Request Body</h4><pre>${r.body === undefined ? '(없음)' : esc(JSON.stringify(r.body, null, 2))}</pre></div>
      <div><h4>Response (${r.status})</h4><pre>${esc(JSON.stringify(r.response, null, 2))}</pre></div>
    </div>
  </section>`).join('');
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>TICKETFLOW API 테스트</title>
<style>body{font-family:'Malgun Gothic',system-ui,sans-serif;background:#f4f5f7;margin:0;padding:24px;color:#222}
h1{font-size:20px;margin:0 0 4px}p.sub{color:#666;margin:0 0 16px;font-size:13px}
.card{background:#fff;border:1px solid #ddd;border-radius:8px;padding:14px 16px;margin-bottom:16px}
.head{display:flex;gap:10px;align-items:center;font-family:Consolas,monospace;font-size:14px}
.m{font-weight:bold;padding:2px 8px;border-radius:4px;color:#fff}.GET{background:#2e7d32}.POST{background:#ef6c00}.PATCH{background:#6a1b9a}.DELETE{background:#c62828}
.u{flex:1;word-break:break-all}.s{font-weight:bold;padding:2px 8px;border-radius:4px}.ok{background:#e8f5e9;color:#2e7d32}.err{background:#fdecea;color:#c62828}.ms{color:#888;font-size:12px}
.label{margin:6px 0 8px;color:#444;font-size:13px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
h4{margin:6px 0 4px;font-size:12px;color:#666}pre{background:#1e1e1e;color:#d4d4d4;padding:10px;border-radius:6px;font-size:12px;white-space:pre-wrap;margin:0}</style></head>
<body><h1>🎫 TICKETFLOW API 테스트 결과</h1><p class="sub">대상 서버: ${esc(BASE)} · 실행 시각: ${new Date().toLocaleString('ko-KR')} · x-admin-key는 마스킹 표시</p>${cards}</body></html>`;
  const name = BASE.includes('localhost') ? 'api-test-local.html' : 'api-test-render.html';
  const out = path.join(__dirname, '..', 'test-results', name);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  console.log(`\n보고서 저장: ${out}`);
}

(async () => {
  try {
    await call('기본 서버 확인', 'GET', '/');
    await call('테스트 1. 공연 목록 조회', 'GET', '/performances');
    const created = await call('테스트 2. 공연 등록', 'POST', '/performances', {
      admin: true,
      body: { title: 'TICKETFLOW 테스트 공연', venue: '테스트 공연장', starts_at: '2026-12-25T19:00:00+09:00', price: 30000 },
    });
    const id = created.response?.performance?.id;
    if (id) {
      await call('테스트 3. 공연 수정 (title, price만 변경)', 'PATCH', `/performances/${id}`, {
        admin: true,
        body: { title: '수정된 테스트 공연', price: 40000 },
      });
      await call('선택 1. 공연 상세 조회', 'GET', `/performances/${id}`);
      await call('테스트 4. 공연 삭제', 'DELETE', `/performances/${id}`, { admin: true });
    }
    await call('오류 1. 존재하지 않는 공연 수정 → 404', 'PATCH', '/performances/999999', { admin: true, body: { price: 1000 } });
    await call('오류 2. 존재하지 않는 공연 삭제 → 404', 'DELETE', '/performances/999999', { admin: true });
    await call('오류 3. 필수 입력값 누락 → 400', 'POST', '/performances', { admin: true, body: { title: '제목만 있는 공연' } });
    await call('오류 4. API 키 없이 등록 → 401', 'POST', '/performances', { body: { title: 'x', venue: 'y', starts_at: '2026-12-31T19:00:00+09:00', price: 0 } });
    await call('오류 5. 잘못된 공연 ID → 400', 'DELETE', '/performances/abc', { admin: true });
    await call('최종 공연 목록 (테스트 공연 삭제 확인)', 'GET', '/performances');
  } catch (e) {
    console.error('테스트 실행 오류:', e.message);
  } finally {
    writeReport();
  }
})();
