import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Sprout } from 'lucide-react'
import { supabase, IS_SUPABASE_CONFIGURED, SUPABASE_URL } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { usePageEnter } from '../components/ui'

export default function Login() {
  const { user, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const rootRef = usePageEnter<HTMLDivElement>()
  if (!loading && user) return <Navigate to="/" replace />
  return (
    <div ref={rootRef} className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-sm">
        <div data-anim="header" className="text-center mb-5">
          <span className="inline-grid place-items-center w-[52px] h-[56px] rounded-2xl bg-[#37664d] text-white -rotate-[5deg] mb-3">
            <Sprout size={30} />
          </span>
          <h1 className="font-display text-[33px] tracking-tight text-[#293b35]">FuturePlanner</h1>
          <p className="text-[12px] mt-1" style={{ color: '#7a877f' }}>Single-user · LKR · Private 5-year tracker</p>
        </div>
        <div data-anim="card" className="card">
          <p className="text-sm text-[#43564a] mb-4">Sign in with magic link.</p>
          {!IS_SUPABASE_CONFIGURED && (
            <p className="text-sm text-[#8a5f14] border border-amber-300/50 bg-amber-50 rounded-lg p-2 mb-3">
              Backend not configured — this build points at {SUPABASE_URL}. Rebuild with VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY set.
            </p>
          )}
          {sent ? <p className="text-sm text-[#2f7a4e]">Check your email for the login link.</p> : (
            <form className="space-y-3" onSubmit={async (e) => {
              e.preventDefault(); setErr(null)
              const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } })
              if (error) setErr(error.message); else setSent(true)
            }}>
              <div><div className="label">Email</div><input className="input" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></div>
              {err && <p className="text-sm text-[#ad5347]">{err}</p>}
              <button className="btn w-full" type="submit">Send magic link</button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
