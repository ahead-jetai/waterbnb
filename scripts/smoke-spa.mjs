import assert from 'node:assert/strict'

const origin = new URL(process.argv[2])
assert.ok(['http:', 'https:'].includes(origin.protocol), 'Use an HTTP(S) app URL')

async function get(path, accept) {
  const response = await fetch(new URL(path, origin), {
    signal: AbortSignal.timeout(10_000), headers: { accept }, redirect: 'error',
  })
  assert.equal(response.status, 200, path)
  return response
}

const health = await get('/healthz.json', 'application/json')
assert.equal((await health.json()).service, 'waterbnb')
const app = await (await get('/', 'text/html')).text()
assert.match(app, /id="root"/)
for (const path of ['/trips', '/hosting', '/booking/staging-probe/payment', '/terms', '/privacy', '/cancellation', '/safety', '/support']) {
  assert.equal(await (await get(path, 'text/html')).text(), app, `${path} must serve the app shell`)
}
const entry = app.match(/<script\b[^>]*\bsrc="(\/assets\/[^"]+\.js)"/)?.[1]
assert.ok(entry, 'The production HTML must include a bundled entry point')
const bundle = await get(entry, '*/*')
assert.match(bundle.headers.get('content-type') ?? '', /javascript/)
assert.ok((await bundle.arrayBuffer()).byteLength, 'The app bundle must not be empty')
console.log('Health marker, SPA deep links, and production bundle are reachable.')
