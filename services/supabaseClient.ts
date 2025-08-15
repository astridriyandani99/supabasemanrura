import { createClient } from '@supabase/supabase-js';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      assessments: {
        Row: {
          assessor_id: string | null;
          assessor_notes: string | null;
          assessor_score: number | null;
          poin_id: string;
          updated_at: string;
          ward_id: string;
          ward_staff_evidence: Json | null;
          ward_staff_notes: string | null;
          ward_staff_score: number | null;
        };
        Insert: {
          assessor_id?: string | null;
          assessor_notes?: string | null;
          assessor_score?: number | null;
          poin_id: string;
          updated_at?: string;
          ward_id: string;
          ward_staff_evidence?: Json | null;
          ward_staff_notes?: string | null;
          ward_staff_score?: number | null;
        };
        Update: {
          assessor_id?: string | null;
          assessor_notes?: string | null;
          assessor_score?: number | null;
          poin_id?: string;
          updated_at?: string;
          ward_id?: string;
          ward_staff_evidence?: Json | null;
          ward_staff_notes?: string | null;
          ward_staff_score?: number | null;
        };
      };
      profiles: {
        Row: {
          id: string;
          name: string;
          email: string;
          role: string;
          ward_id: string | null;
        };
        Insert: {
          id: string;
          name: string;
          email: string;
          role: string;
          ward_id?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          role?: string;
          ward_id?: string | null;
        };
      };
      wards: {
        Row: {
          id: string;
          name: string;
        };
        Insert: {
          id: string;
          name: string;
        };
        Update: {
          id?: string;
          name?: string;
        };
      };
      assessment_periods: {
        Row: {
          id: string;
          name: string;
          start_date: string;
          end_date: string;
        };
        Insert: {
          id?: string;
          name: string;
          start_date: string;
          end_date: string;
        };
        Update: {
          id?: string;
          name?: string;
          start_date?: string;
          end_date?: string;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
}


const supabaseUrl = 'https://brxmkauvcvgmprmyswtj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyeG1rYXV2Y3ZnbXBybXlzd3RqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNTM3MTQsImV4cCI6MjA3MDgyOTcxNH0.4gQET1l_yt6rxqOXvqw5VPXlO5hKzwODDrc1eTbP3kk';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);