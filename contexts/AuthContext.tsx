import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import type { Profile, UserRole } from '../types';
import type { AuthChangeEvent, Session, User as SupabaseUser } from '@supabase/supabase-js';


interface AuthContextType {
  currentUser: Profile | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadingSession: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  // Helper function to fetch profile, set state, and handle errors.
  const fetchProfile = async (user: SupabaseUser) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      
      if (data) {
        const newProfile: Profile = {
            id: data.id,
            name: data.name,
            email: data.email,
            role: data.role as UserRole,
            ward_id: data.ward_id,
        };
        setCurrentUser(newProfile);
      } else {
          throw new Error("User authenticated but profile data not found.");
      }
    } catch (error) {
      setCurrentUser(null); // Ensure user is logged out on any profile error
      throw error; // Re-throw the error for the caller to handle
    }
  };


  useEffect(() => {
    // Check for active session on initial load
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        try {
          await fetchProfile(session.user);
        } catch(e: any) {
          // Fix: Provide a clear error message in the console instead of [object Object]
          console.error("Failed to fetch profile for existing session:", e.message, e);
        }
      }
      setLoadingSession(false);
    }).catch(error => {
        console.error("Auth session check failed, possibly due to configuration error:", error.message);
        setLoadingSession(false);
    });

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
        if (session?.user) {
          try {
            await fetchProfile(session.user);
          } catch(e: any) {
            // Fix: Provide a clear error message in the console instead of [object Object]
            console.error("Failed to fetch profile on auth state change:", e.message, e);
            // currentUser is already set to null inside fetchProfile
          }
        } else {
          setCurrentUser(null);
        }
        setLoadingSession(false);
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      throw new Error(signInError.message);
    }
    if (!signInData.user) {
        throw new Error("Login successful but no user object was returned.");
    }
    
    try {
        await fetchProfile(signInData.user);
    } catch (error) {
        await supabase.auth.signOut(); // Clean up failed login session

        let errorMessage = "Login Gagal: Tidak dapat mengambil profil Anda setelah otentikasi.";
        
        if (typeof error === 'object' && error !== null && 'message' in error) {
            const supabaseError = error as { message: string, details?: string };
            
            // Check for specific RLS error patterns
            if (supabaseError.message?.includes('infinite recursion')) {
                errorMessage = `KESALAHAN KONFIGURASI DATABASE TERDETEKSI

Masalah: Terdeteksi "infinite recursion" pada kebijakan keamanan (RLS) untuk tabel "profiles". Ini BUKAN error pada kode aplikasi, melainkan kesalahan pengaturan di database Supabase Anda.

Solusi:
1. Buka proyek Supabase Anda.
2. Navigasi ke SQL Editor.
3. Salin dan jalankan seluruh query di bawah ini untuk memperbaiki kebijakan keamanan Anda:

-- Menonaktifkan RLS sementara
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Menghapus kebijakan lama yang mungkin salah
DROP POLICY IF EXISTS "Users can view their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.profiles;

-- Membuat kebijakan SELECT yang BENAR
CREATE POLICY "Users can view their own profile."
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- Membuat kebijakan UPDATE yang BENAR
CREATE POLICY "Users can update their own profile."
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Mengaktifkan kembali RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;`;
            } else {
                 errorMessage = `Gagal mengambil profil pengguna: ${supabaseError.message}.`;
                 if (supabaseError.details?.includes('violates row-level security policy') || supabaseError.message.includes('violates row-level security policy')) {
                    errorMessage += " Ini kemungkinan besar disebabkan oleh masalah izin akses data (Row Level Security). Harap hubungi administrator sistem.";
                 }
            }
        }
        
        // Fix: Log the generated user-friendly message along with the original error object
        console.error("Full profile fetch error during login:", errorMessage, error);
        throw new Error(errorMessage);
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        throw new Error(error.message);
    }
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, loadingSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};