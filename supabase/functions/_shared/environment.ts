function parseOrigin(value: string | undefined) {
  if (!value) return
  try {
    const url = new URL(value)
    if (['http:', 'https:'].includes(url.protocol) && url.href === `${url.origin}/`) return url
  } catch {
    return
  }
}

export function getEnvironment(get: (name: string) => string | undefined) {
  const mode = get('APP_ENV') ?? 'local'
  if (mode !== 'local' && mode !== 'staging' && mode !== 'production') {
    throw new Error('APP_ENV must be local, staging, or production')
  }
  const client = parseOrigin(get('CLIENT_URL') ?? (mode === 'local' ? 'http://localhost:5173' : undefined))
  const clerkIssuer = get('CLERK_ISSUER')
  if (!client || (mode !== 'local' && client.protocol !== 'https:')) {
    throw new Error('CLIENT_URL must be the SPA origin (HTTPS in staging and production)')
  }
  if (mode !== 'local') {
    const issuer = parseOrigin(clerkIssuer)
    if (!issuer || issuer.origin !== clerkIssuer || issuer.protocol !== 'https:') {
      throw new Error('CLERK_ISSUER must be an HTTPS issuer origin')
    }
  }
  return { mode, clientOrigin: client.origin, clerkIssuer }
}

export function requireStripeKey(key: string | undefined, production: boolean): string {
  const pattern = production ? /^(rk|sk)_live_/ : /^(rk|sk)_test_/
  if (!key || !pattern.test(key)) throw new Error('Stripe API key does not match APP_ENV')
  return key
}
