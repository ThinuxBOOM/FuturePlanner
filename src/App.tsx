import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './hooks/useAuth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Budgets from './pages/Budgets'
import Goals from './pages/Goals'
import GoalDetail from './pages/GoalDetail'
import Infrastructure from './pages/Infrastructure'
import Plan from './pages/Plan'
import Review from './pages/Review'
import Settings from './pages/Settings'
import { useEffect, type ReactNode } from 'react'
import { ensureSeeds } from './lib/seed'
import { ensurePlanSeeds } from './lib/planSeeds'

const qc = new QueryClient()

function Guard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  useEffect(() => { if (user) { ensureSeeds().catch(console.error); ensurePlanSeeds().catch(console.error) } }, [user])
  if (loading) return <div className="p-8 text-slate-400">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Guard><Layout /></Guard>}>
              <Route index element={<Dashboard />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="budgets" element={<Budgets />} />
              <Route path="goals" element={<Goals />} />
              <Route path="goals/:id" element={<GoalDetail />} />
              <Route path="infrastructure" element={<Infrastructure />} />
              <Route path="plan" element={<Plan />} />
              <Route path="review" element={<Review />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
