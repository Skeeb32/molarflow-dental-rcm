import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles, Stethoscope } from 'lucide-react'
import { authApi, type AuthProviders } from './auth'

type AuthPageProps = {
  path: string
  navigate: (path: string) => void
  providers: AuthProviders
}

const loginNext = () => {
  const next = new URLSearchParams(window.location.search).get('next')
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/'
}

function passwordScore(value: string) {
  return [value.length >= 12, /[a-z]/.test(value) && /[A-Z]/.test(value), /\d/.test(value), /[^A-Za-z0-9]/.test(value)].filter(Boolean).length
}

function ToothMascot({ peek = false, celebrate = false }: { peek?: boolean; celebrate?: boolean }) {
  return <div className={`tooth-mascot${peek ? ' tooth-peek' : ''}${celebrate ? ' tooth-celebrate' : ''}`} aria-hidden="true">
    <svg viewBox="0 0 112 112" role="presentation">
      <path d="M56 10c-10-7-23-6-32 1-12 9-12 25-8 41l9 39c2 9 9 12 15 4l12-17c2-3 5-3 7 0l12 17c6 8 13 5 15-4l9-39c4-16 4-32-8-41-9-7-22-8-31-1Z" fill="#fff" stroke="#4d8068" strokeWidth="3.5" strokeLinejoin="round" />
      <ellipse cx="42" cy="48" rx="3.2" ry="5" fill="#33483c" className="tooth-eye" />
      <ellipse cx="70" cy="48" rx="3.2" ry="5" fill="#33483c" className="tooth-eye" />
      <path d="M43 63c4 6 9 9 13 9s10-3 14-9" fill="none" stroke="#3d7963" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="29" cy="60" r="5" fill="#f3c9b8" opacity=".65" />
      <circle cx="83" cy="60" r="5" fill="#f3c9b8" opacity=".65" />
      <path d="m88 20 2-6m8 14 6-2M18 24l-5-4" stroke="#c4a66d" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
    <span className="tooth-spark tooth-spark-one">✦</span><span className="tooth-spark tooth-spark-two">✦</span>
  </div>
}

function Field({ id, label, type = 'text', autoComplete, required = true }: {
  id: string; label: string; type?: string; autoComplete?: string; required?: boolean
}) {
  const [visible, setVisible] = useState(false)
  const password = type === 'password'
  return <div className="auth-field">
    <label htmlFor={id}>{label}</label>
    <div className="auth-input-wrap">
      {id.includes('email') ? <Mail size={16} aria-hidden="true" /> : password ? <LockKeyhole size={15} aria-hidden="true" /> : null}
      <input id={id} name={id} type={password && visible ? 'text' : type} autoComplete={autoComplete} required={required} minLength={password ? 12 : undefined} />
      {password && <button className="password-toggle" type="button" aria-label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={16} /> : <Eye size={16} />}</button>}
    </div>
  </div>
}

export function AuthPage({ path, navigate, providers }: AuthPageProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [password, setPassword] = useState('')
  const [peek, setPeek] = useState(false)
  const queryClient = useQueryClient()
  const tokenHandled = useRef(false)
  const mode = path === '/signup' ? 'signup'
    : path === '/forgot-password' ? 'forgot-password'
      : path === '/forgot-username' ? 'forgot-username'
        : path === '/verify-email' ? 'verify-email'
          : path.startsWith('/reset-password/') ? 'reset-password'
            : 'login'
  const playful = mode === 'login' || mode === 'signup'

  useEffect(() => {
    document.body.classList.toggle('auth-tooth-cursor', playful)
    return () => document.body.classList.remove('auth-tooth-cursor')
  }, [playful])

  useEffect(() => {
    if (mode !== 'verify-email' || tokenHandled.current) return
    tokenHandled.current = true
    const token = new URLSearchParams(window.location.search).get('token') || ''
    if (!token) { setError('This verification link is missing its token. Request a fresh email.'); return }
    setBusy(true)
    authApi.verifyEmail(token).then(async (result) => {
      setNotice(result.detail)
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      navigate('/')
    }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'The verification link could not be used.'))
      .finally(() => setBusy(false))
  }, [mode, navigate, queryClient])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')
    setBusy(true)
    const form = new FormData(event.currentTarget)
    const value = (key: string) => String(form.get(key) || '')
    try {
      if (mode === 'login') {
        const user = await authApi.login({ email: value('email'), password: value('password'), remember_me: form.get('remember_me') === 'on' })
        queryClient.setQueryData(['auth', 'me'], user)
        navigate(loginNext())
      } else if (mode === 'signup') {
        const result = await authApi.register({
          full_name: value('full_name'), clinic_name: value('clinic_name'), email: value('email'),
          username: value('username'), password: value('password'), password_confirm: value('password_confirm'),
          terms_accepted: form.get('terms_accepted') === 'on',
        })
        setNotice(result.detail)
      } else if (mode === 'forgot-password') {
        const result = await authApi.requestPasswordReset(value('email'))
        setNotice(result.detail)
      } else if (mode === 'forgot-username') {
        const result = await authApi.recoverUsername(value('email'))
        setNotice(result.detail)
      } else if (mode === 'reset-password') {
        const [, , uid = '', token = ''] = path.split('/')
        const result = await authApi.confirmPasswordReset({ uid, token, password: value('password'), password_confirm: value('password_confirm') })
        setNotice(result.detail)
      }
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Something went wrong. Please try again.'
      setError(message)
    } finally {
      setBusy(false)
    }
  }

  async function resendVerification() {
    const form = document.getElementById('auth-form') as HTMLFormElement | null
    const email = form ? String(new FormData(form).get('email') || '') : ''
    setBusy(true)
    setError('')
    try {
      const result = await authApi.resendVerification(email)
      setNotice(result.detail)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Try again later.')
    } finally { setBusy(false) }
  }

  const isLogin = mode === 'login'
  const isSignup = mode === 'signup'
  const title = isLogin ? 'Welcome back' : isSignup ? 'Create your workspace' : mode === 'forgot-password' ? 'Reset your password' : mode === 'forgot-username' ? 'Find your username' : mode === 'reset-password' ? 'Choose a new password' : 'Checking your email'
  const subtitle = isLogin ? 'Your practice is glad you’re here.' : isSignup ? 'A better day at the front desk starts here.' : mode === 'forgot-password' ? 'We’ll send a secure reset link if an account matches.' : mode === 'forgot-username' ? 'We’ll send your username to your verified email.' : mode === 'reset-password' ? 'Choose a strong password you haven’t used here before.' : 'One quick check, and your dental workspace is ready.'
  const showProviders = isLogin || isSignup
  const hasProviders = providers.google || providers.apple || providers.microsoft
  const score = passwordScore(password)

  return <main className="auth-page">
    <section className="auth-story" aria-label="About MolarFlow">
      <a href="/" className="brand auth-brand"><span className="brand-mark"><Stethoscope size={18} strokeWidth={2.4} /></span><span>molarflow</span><span className="brand-dot">.</span></a>
      <div className="auth-story-content">
        <div className="auth-story-kicker"><span className="auth-kicker-dot" /> DENTAL WORKSPACE, MADE CLEARER</div>
        <h1>Care for the claims.<br /><em>Care for the clinic.</em></h1>
        <p>One calm place for dental teams to follow claims, support their practice, and keep the work moving.</p>
        <div className="auth-story-proof"><ShieldCheck size={17} /><span>Built for clinic stakeholders<br /><strong>with privacy in mind</strong></span></div>
        <ToothMascot peek={peek} celebrate={Boolean(notice && isSignup)} />
      </div>
      <div className="auth-story-footer"><span>RCM clarity for the people behind every smile.</span><span>✳ &nbsp; A little less chasing. A little more caring.</span></div>
      <div className="auth-orbit orbit-one" /><div className="auth-orbit orbit-two" />
    </section>

    <section className="auth-panel">
      <div className="auth-panel-top"><span>SECURE PRACTICE ACCESS</span><span><i /> PROTECTED SIGN-IN</span></div>
      <div className="auth-card">
        {!isLogin && !isSignup && <button className="auth-back" type="button" onClick={() => navigate('/login')}><ArrowLeft size={15} /> Back to sign in</button>}
        <div className="auth-mobile-mascot"><ToothMascot peek={peek} celebrate={Boolean(notice && isSignup)} /></div>
        <div className="auth-title-row"><div><div className="auth-eyebrow">{isSignup ? 'YOUR PRACTICE, CONNECTED' : 'MOLARFLOW ACCOUNT'}</div><h2>{title}</h2><p>{subtitle}</p></div>{playful && <Sparkles size={18} className="auth-title-spark" aria-hidden="true" />}</div>

        {error && <div className="auth-alert auth-alert-error" role="alert">{error}{isLogin && error.toLowerCase().includes('verify') && <button type="button" className="auth-inline-button" onClick={resendVerification} disabled={busy}>Resend verification email</button>}</div>}
        {notice && <div className="auth-alert auth-alert-success" role="status"><Check size={16} /> <span>{notice}</span></div>}

        {showProviders && <>
          {hasProviders ? <div className="auth-provider-list">
            {providers.google && <a className="auth-provider" href="/accounts/google/login/?process=login&next=%2F"><span className="provider-google">G</span> Continue with Google</a>}
            {providers.apple && <a className="auth-provider" href="/accounts/apple/login/?process=login&next=%2F"><span className="provider-apple">●</span> Continue with Apple</a>}
            {providers.microsoft && <a className="auth-provider" href="/accounts/microsoft/login/?process=login&next=%2F"><span className="provider-microsoft"><i /><i /><i /><i /></span> Continue with Microsoft</a>}
          </div> : <p className="auth-provider-note">Google, Apple, and Microsoft sign-in appear here after the server is configured with provider credentials.</p>}
          {hasProviders && <div className="auth-divider"><span>or use work email</span></div>}
        </>}

        {mode === 'verify-email' ? <div className="auth-verify-state" role="status"><span className="auth-spinner" />{busy ? 'Verifying your email…' : 'Open the verification link from your email.'}</div> : notice && (isSignup || mode === 'forgot-password' || mode === 'forgot-username' || mode === 'reset-password') ? <div className="auth-success-actions">{isSignup ? <><div className="mail-illustration"><Mail size={23} /></div><strong>Check your inbox</strong><p>We sent an expiring verification link to your work email. Your workspace stays locked until it’s verified.</p><button type="button" className="auth-secondary" onClick={() => navigate('/login')}>Back to sign in</button></> : mode === 'reset-password' ? <button type="button" className="auth-secondary" onClick={() => navigate('/login')}>Return to sign in</button> : null}</div> : <form id="auth-form" className="auth-form" onSubmit={submit}>
          {isSignup && <>
            <Field id="full_name" label="Your full name" autoComplete="name" />
            <Field id="clinic_name" label="Dental clinic or organization" autoComplete="organization" />
            <div className="auth-two-col"><Field id="email" label="Work email" type="email" autoComplete="email" /><Field id="username" label="Username" autoComplete="username" /></div>
            <div className="auth-two-col">
              <div className="auth-field"><label htmlFor="password">Password</label><div className="auth-input-wrap"><LockKeyhole size={15} /><input id="password" name="password" type={peek ? 'text' : 'password'} autoComplete="new-password" minLength={12} required value={password} onChange={(event) => setPassword(event.target.value)} /><button className="password-toggle" type="button" aria-label={peek ? 'Hide password' : 'Show password'} onClick={() => setPeek(!peek)}>{peek ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div>
              <Field id="password_confirm" label="Confirm password" type="password" autoComplete="new-password" />
            </div>
            <div className="password-meter" aria-live="polite"><span className="password-meter-bars">{[0, 1, 2, 3].map((item) => <i key={item} className={score > item ? `strength-${score}` : ''} />)}</span><span>{password ? ['Add a character mix', 'Keep going', 'Good start', 'Strong password', 'Excellent password'][score] : 'Use 12+ characters, with a mix of letters, numbers, and symbols.'}</span></div>
            <label className="auth-check auth-terms"><input type="checkbox" name="terms_accepted" required /><span>I agree to the <a href="https://github.com/Skeeb32/molarflow-dental-rcm/blob/main/docs/terms-of-service.md" target="_blank" rel="noreferrer">Terms</a> and <a href="https://github.com/Skeeb32/molarflow-dental-rcm/blob/main/docs/privacy-notice.md" target="_blank" rel="noreferrer">Privacy Notice</a>. I will use synthetic data only.</span></label>
            <button className="auth-submit" type="submit" disabled={busy}>{busy ? <><span className="auth-spinner" /> Creating secure account…</> : <>Create stakeholder account <span>→</span></>}</button>
            <p className="auth-approval-note"><ShieldCheck size={14} /> New accounts start with access only to their own clinic.</p>
          </>}

          {isLogin && <>
            <Field id="email" label="Work email" type="email" autoComplete="username" />
            <div className="auth-field"><div className="auth-label-row"><label htmlFor="password">Password</label><button type="button" className="auth-text-link" onClick={() => navigate('/forgot-password')}>Forgot password?</button></div><div className="auth-input-wrap"><LockKeyhole size={15} /><input id="password" name="password" type={peek ? 'text' : 'password'} autoComplete="current-password" required /><button className="password-toggle" type="button" aria-label={peek ? 'Hide password' : 'Show password'} onClick={() => setPeek(!peek)}>{peek ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div>
            <div className="auth-login-options"><label className="auth-check"><input type="checkbox" name="remember_me" /><span>Remember me</span></label><button type="button" className="auth-text-link" onClick={() => navigate('/forgot-username')}>Forgot username?</button></div>
            <button className="auth-submit" type="submit" disabled={busy}>{busy ? <><span className="auth-spinner" /> Signing in…</> : <>Sign in to workspace <span>→</span></>}</button>
            <p className="auth-approval-note"><ShieldCheck size={14} /> Session cookies are HTTP-only; production uses HTTPS and secure cookies.</p>
          </>}

          {(mode === 'forgot-password' || mode === 'forgot-username') && <>
            <Field id="email" label="Verified work email" type="email" autoComplete="email" />
            <button className="auth-submit" type="submit" disabled={busy}>{busy ? <><span className="auth-spinner" /> Sending securely…</> : <>{mode === 'forgot-password' ? 'Send reset link' : 'Email my username'} <span>→</span></>}</button>
            <p className="auth-approval-note"><ShieldCheck size={14} /> We’ll never reveal whether an email is registered on this screen.</p>
          </>}

          {mode === 'reset-password' && <>
            <div className="auth-field"><label htmlFor="password">New password</label><div className="auth-input-wrap"><LockKeyhole size={15} /><input id="password" name="password" type={peek ? 'text' : 'password'} autoComplete="new-password" minLength={12} required value={password} onChange={(event) => setPassword(event.target.value)} /><button className="password-toggle" type="button" aria-label={peek ? 'Hide password' : 'Show password'} onClick={() => setPeek(!peek)}>{peek ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div>
            <Field id="password_confirm" label="Confirm new password" type="password" autoComplete="new-password" />
            <p className="password-meter single-meter">{password ? ['Add a character mix', 'Keep going', 'Good start', 'Strong password', 'Excellent password'][score] : 'Use 12+ characters, with a mix of letters, numbers, and symbols.'}</p>
            <button className="auth-submit" type="submit" disabled={busy}>{busy ? <><span className="auth-spinner" /> Updating password…</> : <>Save new password <span>→</span></>}</button>
          </>}
        </form>}

        {(isLogin || isSignup) && <div className="auth-switch">{isLogin ? <>New to MolarFlow? <button type="button" onClick={() => navigate('/signup')}>Create a clinic account</button></> : <>Already have an account? <button type="button" onClick={() => navigate('/login')}>Sign in</button></>}</div>}
        {mode === 'forgot-password' && <p className="auth-foot-link">Need your username too? <button type="button" onClick={() => navigate('/forgot-username')}>Recover it here</button></p>}
      </div>
      <footer className="auth-panel-footer"><span>© 2026 MolarFlow</span><span><ShieldCheck size={13} /> Secure sign-in for dental teams</span></footer>
    </section>
  </main>
}
