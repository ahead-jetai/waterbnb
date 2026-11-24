import { describe, expect, it } from 'vitest'
import { getEnvironment, requireStripeKey } from '../functions/_shared/environment.ts'

function environment(values: Record<string, string>) {
  return getEnvironment(name => values[name])
}

const staging = {
  APP_ENV: 'staging',
  CLIENT_URL: 'https://staging.waterbnb.example',
  CLERK_ISSUER: 'https://staging-clerk.example',
}

describe('hosted deployment isolation', () => {
  it('does not use local or historical defaults for staging', () => {
    expect(environment(staging)).toEqual({
      mode: 'staging', clientOrigin: staging.CLIENT_URL, clerkIssuer: staging.CLERK_ISSUER,
    })
    expect(() => environment({ APP_ENV: 'staging' })).toThrow('CLIENT_URL')
    expect(() => environment({ ...staging, CLIENT_URL: 'http://localhost:5173' })).toThrow('CLIENT_URL')
    expect(() => environment({ ...staging, CLERK_ISSUER: '' })).toThrow('CLERK_ISSUER')
  })

  it('refuses live keys in staging and sandbox keys in production', () => {
    expect(() => requireStripeKey('rk_live_example', false)).toThrow('APP_ENV')
    expect(() => requireStripeKey('rk_test_example', true)).toThrow('APP_ENV')
    expect(requireStripeKey('rk_test_example', false)).toBe('rk_test_example')
  })
})
