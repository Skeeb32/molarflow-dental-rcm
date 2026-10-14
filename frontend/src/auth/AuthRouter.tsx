import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import App from '../App'
import { isDemoMode } from '../api'
import { AuthError, authApi } from './auth'
import { AuthPage } from './AuthPage'
import './auth.css'

function navigate(path: string) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function AuthRouter() {
  const [path, setPath] = useState(window.location.pathname)
  const queryClient = useQueryClient()
  const authQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.me,
    enabled: !isDemoMode,
    retry: false,
  })
  const providersQuery = useQuery({
    queryKey: ['auth', 'providers'],
    queryFn: authApi.providers,
    enabled: !isDemoMode && !authQuery.isLoading && !authQuery.data,
    retry: false,
  })

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  if (isDemoMode) return <App />
  if (authQuery.isLoading) return <div className="auth-service-state" role="status"><span className="auth-spinner" />Checking your secure session…</div>
  if (authQuery.data) {
    if (path !== '/' && !path.startsWith('/dashboard')) navigate('/')
    return <App user={authQuery.data} onLogout={async () => {
      await authApi.logout()
      queryClient.clear()
      navigate('/login')
    }} />
  }
  if (authQuery.isError) {
    const message = authQuery.error instanceof AuthError && authQuery.error.status === 0
      ? 'Start the Django API to use stakeholder sign-in.'
      : 'We could not reach the authentication service. Check that Django is running, then refresh.'
    return <div className="auth-service-state" role="alert">{message}</div>
  }
  return <AuthPage path={path} navigate={navigate} providers={providersQuery.data ?? { google: false, microsoft: false, apple: false }} />
}
