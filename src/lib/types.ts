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
export interface Account { id: UUID; user_id: string; name: string; type: string; opening_balance: number; currency: string; is_archived: boolean; opening_date: string | null; limit_minor: number | null; rate: number | null; statement_minor: number | null; minimum_minor: number | null }
export interface Category { id: UUID; user_id: string; kind: 'income' | 'expense'; name: string; icon: string | null; color: string | null; is_archived: boolean }
export interface Transaction {
  id: UUID; user_id: string; date: string; kind: 'income' | 'expense' | 'transfer' | 'refund' | 'payment';
  amount: number; amount_minor: number | null; interest_minor: number | null;
  account_id: UUID; to_account_id: UUID | null;
  category_id: UUID | null; goal_id: UUID | null; notes: string | null; occurrence: string | null;
}
export interface Budget { id: UUID; user_id: string; month: string; category_id: UUID; planned_amount: number; rollover: boolean; notes: string | null; carry_override: number | null }
export interface IncomePlan { id: UUID; user_id: string; month: string; amount: number }
export interface Schedule {
  id: UUID; user_id: string; name: string; kind: 'income' | 'expense' | 'transfer' | 'refund' | 'payment';
  amount_minor: number; account_id: UUID; to_account_id: UUID | null; category_id: UUID | null;
  interest_minor: number; start_date: string; end_date: string | null; frequency: 'once' | 'weekly' | 'monthly' | 'yearly';
  active: boolean;
}
export interface GoalEntry { id: UUID; user_id: string; goal_id: UUID; amount_minor: number; date: string; notes: string | null }
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
export type PlanItemStatus = 'todo' | 'doing' | 'blocked' | 'done' | 'skipped'
export interface PlanItem {
  id: UUID; user_id: string; stage_id: UUID; track_id: UUID | null; parent_item_id: UUID | null;
  goal_id: UUID | null; infra_item_id: UUID | null;
  title: string; detail: string | null; acceptance_criteria: string | null;
  status: PlanItemStatus; priority: 'p1' | 'p2' | 'p3'; progress_pct: number;
  effort: 'S' | 'M' | 'L' | null; target_date: string | null; start_date: string | null;
  completed_at: string | null; is_custom: boolean; source_key: string | null; sort: number; archived: boolean;
}
export interface PlanItemLink { id: UUID; user_id: string; from_item_id: UUID; to_item_id: UUID }
