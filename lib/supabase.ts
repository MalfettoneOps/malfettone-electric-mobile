import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://olmeennmfvfukmvzwqvw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sbWVlbm5tZnZmdWttdnp3cXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMDAzMTUsImV4cCI6MjA4OTY3NjMxNX0.POmU7peTSCNWwWnPkrWDTeW8nSn67hfzBoKrMxYGDp0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ─── Types matching the actual Supabase schema ────────────────────────────────
export type JobStatus =
  | 'booking_confirmed'
  | 'appointment_reminder'
  | 'on_the_way'
  | 'in_progress'
  | 'completed'
  | 'follow_up_sent';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  is_admin: boolean;
  stripe_customer_id: string | null;
  created_at: string;
}

export interface Job {
  id: string;
  customer_id: string;
  title: string;
  service_type: string;
  description: string | null;
  status: JobStatus;
  scheduled_at: string | null;
  technician_name: string;
  amount: number | null;
  invoice_url: string | null;
  review_requested: boolean;
  created_at: string;
  profile?: {
    full_name: string;
    email: string;
    phone: string;
  };
}

export interface TimelineEvent {
  id: string;
  job_id: string;
  status: JobStatus;
  timestamp: string;
  note: string | null;
}

// ─── Status config ────────────────────────────────────────────────────────────
export const STATUS_CONFIG: Record<JobStatus, { label: string; color: string }> = {
  booking_confirmed:    { label: 'Confirmed',      color: '#7CC73F' },
  appointment_reminder: { label: 'Reminder Sent',  color: '#FAAD14' },
  on_the_way:           { label: 'On the Way',     color: '#60a5fa' },
  in_progress:          { label: 'In Progress',    color: '#f97316' },
  completed:            { label: 'Completed',      color: '#a3e635' },
  follow_up_sent:       { label: 'Follow-Up Sent', color: '#a78bfa' },
};

// ─── Auth helpers ─────────────────────────────────────────────────────────────
export async function getCurrentProfile(): Promise<Profile | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();
  return data as Profile | null;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
