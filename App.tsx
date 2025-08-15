import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import LoginScreen from './components/LoginScreen';
import AuthenticatedApp from './components/AuthenticatedApp';
import { supabase } from './services/supabaseClient';
import type { Profile, Ward, AllAssessments, Assessment, AssessmentPeriod } from './types';
import PublicLandingPage from './components/PublicLandingPage';

// Helper function to transform flat assessment array to nested object for easier component consumption
const transformAssessments = (assessments: Assessment[]): AllAssessments => {
    const transformed: AllAssessments = {};
    for (const assessment of assessments) {
        if (!transformed[assessment.ward_id]) {
            transformed[assessment.ward_id] = {};
        }
        transformed[assessment.ward_id][assessment.poin_id] = assessment;
    }
    return transformed;
};

const App: React.FC = () => {
  const { currentUser, loadingSession } = useAuth();
  
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [allAssessments, setAllAssessments] = useState<AllAssessments>({});
  const [assessmentPeriods, setAssessmentPeriods] = useState<AssessmentPeriod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'landing' | 'login'>('landing');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const [
            { data: wardsData, error: wardsError },
            { data: profilesData, error: profilesError },
            { data: periodsData, error: periodsError },
            { data: assessmentsData, error: assessmentsError },
        ] = await Promise.all([
            supabase.from('wards').select('*'),
            supabase.from('profiles').select('*'),
            supabase.from('assessment_periods').select('*'),
            supabase.from('assessments').select('*'),
        ]);

        if (wardsError) throw wardsError;
        if (profilesError) throw profilesError;
        if (periodsError) throw periodsError;
        if (assessmentsError) throw assessmentsError;

        setWards(wardsData || []);
        setProfiles(profilesData || []);
        setAssessmentPeriods(periodsData || []);
        setAllAssessments(transformAssessments(assessmentsData || []));

      } catch (err) {
        const errorMessage = (err instanceof Error) ? `Failed to load data: ${err.message}` : 'An unknown error occurred while connecting to the database.';
        setError(errorMessage);
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    // --- FIX: Only fetch data IF a user is logged in ---
    if (currentUser) {
      fetchData();
    } else {
      // If there's no user, we're not loading data.
      setIsLoading(false);
    }
  }, [currentUser]); // The dependency array now correctly listens for auth changes

  if (isLoading || loadingSession) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-sky-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-slate-600">{loadingSession ? 'Authenticating session...' : 'Loading application data...'}</p>
        </div>
      </div>
    );
  }

  if (error) {
     return (
      <div className="flex items-center justify-center min-h-screen bg-red-50 p-4">
        <div className="w-full max-w-lg p-8 bg-white rounded-xl shadow-lg border border-red-200">
          <h1 className="text-2xl font-bold text-red-700">Database Connection Error</h1>
          <p className="mt-4 text-slate-700">The application could not connect to the Supabase backend. Please check your internet connection and the Supabase project status.</p>
          <p className="mt-4 text-slate-700 whitespace-pre-wrap bg-red-100 p-4 rounded-md border border-red-200 font-mono text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    if (view === 'login') {
      return <LoginScreen onBack={() => setView('landing')} />;
    }
    return <PublicLandingPage onLoginClick={() => setView('login')} />;
  }

  return (
    <AuthenticatedApp 
      currentUser={currentUser}
      allUsers={profiles}
      setUsers={setProfiles}
      wards={wards}
      setWards={setWards}
      allAssessments={allAssessments}
      setAllAssessments={setAllAssessments}
      assessmentPeriods={assessmentPeriods}
      setAssessmentPeriods={setAssessmentPeriods}
    />
  );
};

export default App;