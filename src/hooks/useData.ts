import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useTable<T>(table: string, orderBy?: { column: string; ascending?: boolean }) {
  return useQuery({
    queryKey: [table],
    queryFn: async () => {
      let q = supabase.from(table).select('*')
      if (orderBy) q = q.order(orderBy.column, { ascending: orderBy.ascending ?? true })
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as T[]
    }
  })
}

export function useInsert(table: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (row: Record<string, unknown>) => {
      const { data, error } = await supabase.from(table).insert(row).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [table] })
  })
}

export function useUpdate(table: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const { error } = await supabase.from(table).update(patch).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [table] })
  })
}

export function useDelete(table: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [table] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['goals'] })
    }
  })
}
