import assert from 'node:assert/strict';
import { randomUUID, createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';

const base = process.env.FILEWORKER_URL || 'http://127.0.0.1:8794';
const password = process.env.FILEWORKER_PASSWORD ||
  readFileSync(process.env.FILEWORKER_PASSWORD_FILE || '.dev.vars', 'utf8').match(/^PASSWORD=(.+)$/m)?.[1];
assert.ok(password, 'Provide a test password');
const prefix = `codex-smoke-${randomUUID()}`;
const textKey = `${prefix}.txt`;
const binaryKey = `${prefix}.bin`;
const emptyKey = `${prefix}-empty.txt`;
const text = 'FileWorker smoke test · 剪贴板\n';
const cookie = `PASSWORD=${encodeURIComponent(password)}`;
const results = [];
const req = (path, options = {}, authenticated = true) => fetch(base + path, {
  ...options,
  headers: { ...(authenticated ? { Cookie: cookie } : {}), ...options.headers },
  signal: AbortSignal.timeout(30000),
});
async function expectStatus(label, response, status) {
  assert.equal(response.status, status, `${label}: ${response.status}`);
  results.push(label);
  return response;
}
try {
  await expectStatus('unauthenticated list rejected', await req('/api/list', {}, false), 401);
  await expectStatus('private text upload', await req(`/${textKey}`, {
    method: 'PUT', body: text,
    headers: { 'x-store-visibility': 'private', 'x-store-type': 'text' },
  }), 200);
  await expectStatus('private download protected', await req(`/${textKey}`, {}, false), 404);
  const download = await expectStatus('authenticated text download', await req(`/${textKey}`), 200);
  assert.equal(await download.text(), text);
  assert.match(download.headers.get('content-type'), /text\/plain/);
  const listing = await expectStatus('file listing', await req(`/api/list?Prefix=${prefix}&MaxKeys=1`), 200);
  const listed = await listing.json();
  assert.equal(listed.Contents[0].Key, textKey);
  await expectStatus('invalid signature rejected', await req(`/${textKey}?expire=${Date.now()+60000}&sign=invalid`, {}, false), 404);
  const path = `/${textKey}?expire=${Date.now()+60000}`;
  const signature = createHmac('sha256', password).update(path).digest('base64');
  const signed = await expectStatus('valid signed download', await req(`${path}&sign=${encodeURIComponent(signature)}`, {}, false), 200);
  assert.equal(await signed.text(), text);
  await expectStatus('visibility update', await req(`/${textKey}`, {
    method: 'PATCH', headers: { 'x-store-visibility': 'public' },
  }), 200);
  const publicDownload = await expectStatus('public download', await req(`/${textKey}`, {}, false), 200);
  assert.equal(await publicDownload.text(), text);
  assert.match(publicDownload.headers.get('content-type'), /text\/plain/);
  const binary = Buffer.alloc(6 * 1024 * 1024, 0xa5);
  await expectStatus('6 MiB binary upload', await req(`/${binaryKey}`, {
    method: 'PUT', body: binary,
    headers: { 'content-type': 'application/octet-stream', 'x-store-visibility': 'private', 'x-store-type': 'file' },
  }), 200);
  const binaryDownload = await expectStatus('binary download', await req(`/${binaryKey}`), 200);
  assert.deepEqual(Buffer.from(await binaryDownload.arrayBuffer()), binary);
  await expectStatus('empty file upload', await req(`/${emptyKey}`, {
    method: 'PUT', body: '', headers: { 'x-store-visibility': 'private', 'x-store-type': 'text' },
  }), 200);
  assert.equal(await (await req(`/${emptyKey}`)).text(), '');
  const paginated = await (await req(`/api/list?Prefix=${prefix}&MaxKeys=1`)).json();
  assert.equal(paginated.IsTruncated, true);
  const next = await (await req(`/api/list?Prefix=${prefix}&MaxKeys=1&ContinuationToken=${encodeURIComponent(paginated.NextContinuationToken)}`)).json();
  assert.notEqual(paginated.Contents[0].Key, next.Contents[0].Key);
  results.push('list pagination');
} finally {
  for (const key of [textKey, binaryKey, emptyKey]) {
    await expectStatus('cleanup test file', await req(`/${key}`, { method: 'DELETE' }), 200);
  }
}
await expectStatus('deleted file unavailable', await req(`/${textKey}`), 404);
console.log(JSON.stringify({ base, passed: results.length, checks: results }, null, 2));
