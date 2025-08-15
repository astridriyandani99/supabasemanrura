import type { Json as SupabaseJson } from './services/supabaseClient';

export type Json = SupabaseJson;

export interface PoinPenilaian {
  id: string;
  text: string;
  bukti: string;
}

export interface ElementoPenilaian {
  id:string;
  title: string;
  description: string;
  poin: PoinPenilaian[];
}

export interface Standard {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  elements: ElementoPenilaian[];
}

export type UserRole = 'Assessor' | 'Ward Staff' | 'Admin';

// Disederhanakan untuk Supabase Storage
export interface Evidence {
  name: string;
  url: string; 
  type: string;
}

// Tipe baru yang mencerminkan tabel 'assessments' di Supabase
export interface Assessment {
  ward_id: string;
  poin_id: string;
  ward_staff_score: number | null;
  ward_staff_notes: string | null;
  ward_staff_evidence: Json | null; // Tipe JSONB di Supabase
  assessor_score: number | null;
  assessor_notes: string | null;
  assessor_id: string | null; // UUID dari auth.users
  updated_at: string;
}

// Struktur data penilaian dalam state aplikasi untuk kemudahan akses
// Kunci luar adalah ID Ruangan, kunci dalam adalah ID Poin Penilaian
export type AllAssessments = Record<string, Record<string, Assessment>>;

export interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
}

export interface Ward {
  id: string;
  name: string;
}

// Mengganti 'User' dengan 'Profile' agar cocok dengan tabel 'profiles' di Supabase
export interface Profile {
  id: string; // UUID dari auth.users
  name: string;
  email: string;
  role: UserRole;
  ward_id: string | null; // Foreign key ke tabel 'wards'
}

export interface AssessmentPeriod {
  id: string; // UUID
  name: string;
  start_date: string; // ISO string format
  end_date: string;   // ISO string format
}