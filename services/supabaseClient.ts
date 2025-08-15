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


// =================================================================================
// IMPORTANT: KONFIGURASI SUPABASE
// Ganti nilai di bawah ini dengan URL dan Kunci Anon (Anon Key) dari proyek Supabase Anda.
// Anda dapat menemukan informasi ini di Pengaturan (Settings) > API di dasbor Supabase.
// =================================================================================
export const supabaseUrl = 'https://brxmkauvcvgmprmyswtj.supabase.co'; // <-- GANTI INI
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyeG1rYXV2Y3ZnbXBybXlzd3RqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNTM3MTQsImV4cCI6MjA3MDgyOTcxNH0.4gQET1l_yt6rxqOXvqw5VPXlO5hKzwODDrc1eTbP3kk'; // <-- GANTI INI

// Check for placeholder credentials and create an error message if they exist.
export const supabaseConfigError: string | null = (supabaseUrl.includes('gantidenganurlprojekanda') || supabaseAnonKey.includes('gantidengankuncianonanda'))
    ? "Konfigurasi Supabase belum selesai. Silakan buka file 'services/supabaseClient.ts' dan ganti placeholder URL dan Kunci Anon dengan kredensial proyek Supabase Anda yang sebenarnya."
    : null;

let supabaseInstance;

if (supabaseConfigError) {
    // If the config is incomplete, create a dummy client.
    // Its methods will return rejected promises, preventing network calls
    // and allowing other parts of the app to catch the configuration error.
    const reject = () => Promise.reject(new Error(supabaseConfigError));
    
    // onAuthStateChange needs a specific return shape to avoid crashing the app on startup.
    const onAuthStateChange = () => ({ data: { subscription: { unsubscribe: () => {} } } });

    // storage.from().getPublicUrl needs to return a specific shape.
    const getPublicUrl = () => ({ data: { publicUrl: '#' }});

    const dummyStorageFrom = {
        upload: reject,
        getPublicUrl: getPublicUrl
    };

    const dummyFrom = {
        select: reject, insert: reject, update: reject, upsert: reject, delete: reject,
    };

    const dummyClient = {
        from: () => dummyFrom,
        auth: {
            getSession: reject,
            onAuthStateChange: onAuthStateChange,
            signInWithPassword: reject,
            signOut: reject,
            signUp: reject,
        },
        storage: {
            from: () => dummyStorageFrom,
        },
    };
    supabaseInstance = dummyClient;
} else {
    // If the config is valid, create the real Supabase client.
    supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey);
}

// Export the initialized client (either real or dummy).
export const supabase = supabaseInstance as any;
