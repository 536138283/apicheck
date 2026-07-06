import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { workerConfig } from './uptime.config'

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
}

function withNoStoreHeaders(response: NextResponse) {
  for (const [key, value] of Object.entries(noStoreHeaders)) {
    response.headers.set(key, value)
  }

  return response
}

export async function middleware(request: NextRequest) {
  // @ts-ignore
  const passwordProtection = workerConfig.passwordProtection
  if (passwordProtection) {
    const authHeader = request.headers.get('Authorization')
    let authenticated = false
    const expected = 'Basic ' + btoa(passwordProtection)

    if (authHeader && authHeader.length === expected.length) {
      // a simple timing-safe compare
      authenticated = true
      for (let i = 0; i < authHeader.length; i++) {
        if (authHeader[i] !== expected[i]) authenticated = false
      }
    }

    if (!authenticated) {
      return withNoStoreHeaders(
        NextResponse.json(
          { code: 401, message: 'Not authenticated' },
          { status: 401, headers: { 'WWW-Authenticate': 'Basic' } }
        )
      )
    }
  }

  return withNoStoreHeaders(NextResponse.next())
}
