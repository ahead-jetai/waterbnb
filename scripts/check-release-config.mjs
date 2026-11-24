import { loadEnv } from 'vite'

const mode = process.argv[2]
if (mode !== 'staging' && mode !== 'production') {
  console.error('Usage: node scripts/check-release-config.mjs <staging|production>')
  process.exit(1)
}

const env = loadEnv(mode, process.cwd(), 'VITE_')
let url
try { url = new URL(env.VITE_SUPABASE_URL) } catch { /* reported below */ }
const pub = mode === 'production' ? /^pk_live_/ : /^pk_test_/
const checks = [
  [url?.protocol === 'https:' && url.href === `${url.origin}/`, 'VITE_SUPABASE_URL must be an HTTPS origin'],
  [/^sb_publishable_/.test(env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ''), 'VITE_SUPABASE_PUBLISHABLE_KEY must be a Supabase publishable key'],
  [pub.test(env.VITE_CLERK_PUBLISHABLE_KEY ?? ''), `VITE_CLERK_PUBLISHABLE_KEY must match ${mode}`],
]
const failures = checks.filter(([ok]) => !ok)
for (const [, message] of failures) console.error(message)
if (failures.length) process.exitCode = 1
else console.log(`Frontend configuration matches ${mode}. Verify the project and issuer match their staging/production assignments.`)
