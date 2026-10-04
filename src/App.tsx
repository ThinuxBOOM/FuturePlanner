import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ToastProvider } from './components/feedback'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Budgets from './pages/Budgets'
import Goals from './pages/Goals'
import GoalDetail from './pages/GoalDetail'
import { Suspense, lazy, useEffect, type ReactNode } from 'react'
import { ensureSeeds } from './lib/seed'
import { ensurePlanSeeds } from './lib/planSeeds'

const Infrastructure = lazy(() => import('./pages/Infrastructure'))
const Plan = lazy(() => import('./pages/Plan'))
const Review = lazy(() => import('./pages/Review'))
const Settings = lazy(() => import('./pages/Settings'))

const qc = new QueryClient()

function Guard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  useEffect(() => { if (user) { ensureSeeds().catch(console.error); ensurePlanSeeds().catch(console.error) } }, [user])
  if (loading) return <div className="p-8 text-slate-400">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

function LazyFallback() {
  return <div className="card"><div className="skeleton h-32" /></div>
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Guard><Layout /></Guard>}>
                <Route index element={<Dashboard />} />
                <Route path="transactions" element={<Transactions />} />
                <Route path="budgets" element={<Budgets />} />
                <Route path="goals" element={<Goals />} />
                <Route path="goals/:id" element={<GoalDetail />} />
                <Route path="infrastructure" element={<Suspense fallback={<LazyFallback />}><Infrastructure /></Suspense>} />
                <Route path="plan" element={<Suspense fallback={<LazyFallback />}><Plan /></Suspense>} />
                <Route path="review" element={<Suspense fallback={<LazyFallback />}><Review /></Suspense>} />
                <Route path="settings" element={<Suspense fallback={<LazyFallback />}><Settings /></Suspense>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
