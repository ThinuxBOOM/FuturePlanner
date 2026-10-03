import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !anon) {
  console.warn('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — set .env from .env.example')
}

export const SUPABASE_URL = url ?? 'https://placeholder.supabase.co'
export const IS_SUPABASE_CONFIGURED = Boolean(url && anon && !url.includes('placeholder'))

export const supabase = createClient(SUPABASE_URL, anon ?? 'placeholder')
