export type AuthUser = {
  id: number
  email: string
  username: string
  full_name: string
  practices: Array<{ id: number; name: string; role: 'stakeholder' }>
}

export type AuthProviders = { google: boolean; microsoft: boolean; apple: boolean }

export class AuthError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function csrfToken() {
  let response: Response
  try {
    response = await fetch('/api/auth/csrf/', { credentials: 'include' })
  } catch {
    throw new AuthError('The authentication service is unavailable.', 0)
  }
  if (!response.ok) throw new AuthError('The authentication service is unavailable.', response.status)
  const data = await response.json() as { csrfToken: string }
  return data.csrfToken
}

async function authRequest<T>(path: string, body?: unknown): Promise<T> {
  const method = body === undefined ? 'GET' : 'POST'
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    headers['X-CSRFToken'] = await csrfToken()
  }
  let response: Response
  try {
    response = await fetch(`/api/auth/${path}`, {
      method,
      credentials: 'include',
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new AuthError('The authentication service is unavailable.', 0)
  }
  if (response.status === 204) return undefined as T
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>
  if (!response.ok) {
    const fieldErrors = Object.entries(payload).filter(([key]) => key !== 'detail')
      .flatMap(([, value]) => Array.isArray(value) ? value.map(String) : [])
    const detail = typeof payload.detail === 'string' ? payload.detail : fieldErrors[0] || 'The request could not be completed.'
    throw new AuthError(detail, response.status)
  }
  return payload as T
}

export const authApi = {
  me: async () => {
    try {
      return await authRequest<AuthUser>('me/')
    } catch (error) {
      if (error instanceof AuthError && [401, 403].includes(error.status)) return null
      throw error
    }
  },
  providers: () => authRequest<AuthProviders>('providers/'),
  login: (payload: { email: string; password: string; remember_me: boolean }) => authRequest<AuthUser>('login/', payload),
  register: (payload: { full_name: string; clinic_name: string; email: string; username: string; password: string; password_confirm: string; terms_accepted: boolean }) => authRequest<{ detail: string }>('register/', payload),
  verifyEmail: (token: string) => authRequest<{ detail: string }>('verify-email/', { token }),
  resendVerification: (email: string) => authRequest<{ detail: string }>('resend-verification/', { email }),
  requestPasswordReset: (email: string) => authRequest<{ detail: string }>('password-reset/', { email }),
  confirmPasswordReset: (payload: { uid: string; token: string; password: string; password_confirm: string }) => authRequest<{ detail: string }>('password-reset/confirm/', payload),
  recoverUsername: (email: string) => authRequest<{ detail: string }>('username-recovery/', { email }),
  logout: () => authRequest<void>('logout/', {}),
}
