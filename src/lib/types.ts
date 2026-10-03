export type UUID = string

export interface Track { id: UUID; user_id: string; name: string; purpose: string | null; color: string | null; sort: number; archived: boolean }
export interface Stage { id: UUID; user_id: string; key: string; title: string; timing_text: string | null; objective: string | null; sort: number }
export interface Goal {
  id: UUID; user_id: string; track_id: UUID | null; stage_id: UUID | null;
  title: string; notes: string | null; type: string;
  target_amount: number | null; target_date: string | null; start_date: string | null;
  status: 'active' | 'paused' | 'done' | 'archived'; priority: string; progress_mode: string;
}
export interface Milestone { id: UUID; user_id: string; goal_id: UUID; title: string; due_date: string | null; amount: number | null; is_done: boolean; done_at: string | null; sort: number }
export interface Account { id: UUID; user_id: string; name: string; type: string; opening_balance: number; currency: string; is_archived: boolean }
export interface Category { id: UUID; user_id: string; kind: 'income' | 'expense'; name: string; icon: string | null; color: string | null; is_archived: boolean }
export interface Transaction {
  id: UUID; user_id: string; date: string; kind: 'income' | 'expense' | 'transfer';
  amount: number; account_id: UUID; to_account_id: UUID | null;
  category_id: UUID | null; goal_id: UUID | null; notes: string | null;
}
export interface Budget { id: UUID; user_id: string; month: string; category_id: UUID; planned_amount: number; rollover: boolean; notes: string | null }
export interface InfraItem {
  id: UUID; user_id: string; order_n: number; name: string; spec_notes: string | null; trigger_text: string | null;
  est_min: number | null; est_max: number | null; status: string; purchased_amount: number | null; purchased_at: string | null; goal_id: UUID | null;
}
export interface MetricEntry { id: UUID; user_id: string; month: string; category: string; key: string; value_num: number | null; value_text: string | null; notes: string | null }
export interface Profile { id: UUID; display_name: string | null; base_currency: string }
export interface RecurringRule {
  id: UUID; user_id: string; kind: 'income' | 'expense' | 'transfer'; amount: number;
  account_id: UUID | null; to_account_id: UUID | null; category_id: UUID | null; goal_id: UUID | null;
  notes: string | null; freq: string; interval_n: number; next_run: string | null; end_date: string | null; is_active: boolean;
}
