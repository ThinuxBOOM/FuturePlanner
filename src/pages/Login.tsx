import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { user, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  if (!loading && user) return <Navigate to="/" replace />
  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="card max-w-sm w-full space-y-4">
        <h1 className="text-xl font-bold">FuturePlanner</h1>
        <p className="text-sm text-slate-400">Single-user · LKR · Private 5-year tracker. Sign in with magic link.</p>
        {sent ? <p className="text-sm text-emerald-300">Check your email for the login link.</p> : (
          <form className="space-y-3" onSubmit={async (e) => {
            e.preventDefault(); setErr(null)
            const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } })
            if (error) setErr(error.message); else setSent(true)
          }}>
            <div><div className="label">Email</div><input className="input" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></div>
            {err && <p className="text-sm text-red-300">{err}</p>}
            <button className="btn w-full" type="submit">Send magic link</button>
          </form>
        )}
      </div>
    </div>
  )
}
