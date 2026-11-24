import { createRemoteJWKSet, jwtVerify } from 'npm:jose@5'

export function createClerkVerifier(issuer: string | undefined, origin: string) {
  const keys = issuer && createRemoteJWKSet(new URL('/.well-known/jwks.json', issuer))
  return async (req: Request): Promise<string | undefined> => {
    const token = req.headers.get('x-clerk-token')
    if (!token || !keys) return
    try {
      const { payload } = await jwtVerify(token, keys, {
        issuer, algorithms: ['RS256'], requiredClaims: ['sub', 'exp', 'sid'],
      })
      if (payload.azp === origin && typeof payload.sid === 'string' && payload.sid) return payload.sub
    } catch {
      return
    }
  }
}
