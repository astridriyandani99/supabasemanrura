import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import ContentDisplay from './ContentDisplay';
import Chatbot from './Chatbot';
import AdminDashboard from './AdminDashboard';
import { manruraData } from '../data/manruraData';
import type { Standard, Profile, Ward, AllAssessments, Assessment, AssessmentPeriod, UserRole } from '../types';
import { ArrowLeftIcon } from './Icons';
import { supabase } from '../services/supabaseClient';
import { useApiKey } from '../contexts/ApiKeyContext';
import SaveStatusIndicator, { SaveStatus } from './SaveStatusIndicator';

interface AuthenticatedAppProps {
    currentUser: Profile;
    allUsers: Profile[];
    setUsers: React.Dispatch<React.SetStateAction<Profile[]>>;
    wards: Ward[];
    setWards: React.Dispatch<React.SetStateAction<Ward[]>>;
    allAssessments: AllAssessments;
    setAllAssessments: React.Dispatch<React.SetStateAction<AllAssessments>>;
    assessmentPeriods: AssessmentPeriod[];
    setAssessmentPeriods: React.Dispatch<React.SetStateAction<AssessmentPeriod[]>>;
}

const AuthenticatedApp: React.FC<AuthenticatedAppProps> = ({
    currentUser,
    allUsers,
    setUsers,
    wards,
    setWards,
    allAssessments,
    setAllAssessments,
    assessmentPeriods,
    setAssessmentPeriods,
}) => {
  const [selectedStandardId, setSelectedStandardId] = useState<string>('bab1');
  const [selectedStandard, setSelectedStandard] = useState<Standard | null>(manruraData[0]);
  const { apiKey } = useApiKey();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  
  const initialWardId = currentUser.role === 'Ward Staff' 
    ? currentUser.ward_id 
    : (wards.length > 0 ? wards[0].id : '');
  const [selectedWardId, setSelectedWardId] = useState<string>(initialWardId || '');

  const [adminSelectedWardId, setAdminSelectedWardId] = useState<string | null>(null);
  
  // Determine active assessment period
  const now = new Date();
  const activePeriod = assessmentPeriods.find(p => {
      const start = new Date(p.start_date);
      const end = new Date(p.end_date);
      end.setHours(23, 59, 59, 999); // Make end date inclusive for the entire day
      return now >= start && now <= end;
  });
  const isAssessmentActive = !!activePeriod;

  useEffect(() => {
    if (currentUser.role !== 'Admin') {
      setAdminSelectedWardId(null);
    }
    if (currentUser.role === 'Ward Staff' && currentUser.ward_id) {
        setSelectedWardId(currentUser.ward_id);
    }
  }, [currentUser]);
  
  useEffect(() => {
    if (selectedStandardId === 'admin_page') {
        setSelectedStandard(null);
        setAdminSelectedWardId(null);
    } else {
        const newStandard = manruraData.find(std => std.id === selectedStandardId) || null;
        setSelectedStandard(newStandard);
    }
  }, [selectedStandardId]);

  const handleScoreChange = async (poinId: string, role: 'wardStaff' | 'assessor', updates: Partial<Assessment>) => {
    if (!isAssessmentActive && currentUser.role !== 'Admin') {
      alert("Tidak dapat menyimpan perubahan karena tidak ada periode penilaian yang aktif.");
      return;
    }
    const wardIdToUpdate = adminSelectedWardId && currentUser.role === 'Admin' ? adminSelectedWardId : selectedWardId;
    if (!wardIdToUpdate) return;
    
    // Optimistically update UI
    setAllAssessments(prev => {
        const updatedWardAssessments = { ...(prev[wardIdToUpdate] || {}) };
        const existingAssessment = updatedWardAssessments[poinId] || {
            ward_id: wardIdToUpdate,
            poin_id: poinId,
        };
        const updatedAssessment = { ...existingAssessment, ...updates };
        if (role === 'assessor') {
            updatedAssessment.assessor_id = currentUser.id;
        }
        updatedWardAssessments[poinId] = updatedAssessment as Assessment;

        return { ...prev, [wardIdToUpdate]: updatedWardAssessments };
    });

    setSaveStatus('saving');
    try {
        const { updated_at, ...rest } = allAssessments[wardIdToUpdate]?.[poinId] || {};

        const payload = {
            ward_id: wardIdToUpdate,
            poin_id: poinId,
            ...rest, // get existing data without updated_at
            ...updates, // apply new updates
            ...(role === 'assessor' && { assessor_id: currentUser.id })
        };
        
        const { error } = await supabase.from('assessments').upsert(payload, { onConflict: 'ward_id, poin_id' });
        if (error) throw error;
        
        setSaveStatus('success');
    } catch (err) {
        console.error("Failed to update assessment:", err);
        const errorMessage = (err instanceof Error) ? err.message : 'Unknown error';
        setSaveStatus({ state: 'error', message: errorMessage });
        // Note: We are not rolling back the optimistic UI update for a simpler UX.
        // A more robust solution might involve refetching data on error.
    } finally {
        setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const addUser = async (user: Omit<Profile, 'id'> & { password?: string }) => {
    setSaveStatus('saving');
    try {
        // Prepare metadata for the trigger. Omit undefined values.
        const metadata: { [key: string]: any } = {
            name: user.name,
            role: user.role,
        };
        if (user.role === 'Ward Staff' && user.ward_id) {
            metadata.ward_id = user.ward_id;
        }

        // 1. Sign up user with metadata. The trigger will create the profile.
        const { data, error: signUpError } = await supabase.auth.signUp({
            email: user.email,
            password: user.password!,
            options: {
                data: metadata,
            }
        });
        
        if (signUpError) throw signUpError;
        if (!data.user) throw new Error("User creation failed in authentication step.");

        // 2. Optimistically update the local state with the new user profile.
        // The trigger creates the profile, so we can assume its structure.
        const newProfile: Profile = {
            id: data.user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            ward_id: (user.role === 'Ward Staff' && user.ward_id) ? user.ward_id : null,
        };
        setUsers(prev => [...prev, newProfile]);
        
        setSaveStatus('success');

    } catch (err) {
        console.error("Failed to add user:", err);
        const errorMessage = (err instanceof Error) ? err.message : 'Unknown error during user creation.';
        setSaveStatus({ state: 'error', message: errorMessage });
        throw err; // re-throw to be caught by the form handler
    }
  };
  
  const addAssessmentPeriod = async (period: Omit<AssessmentPeriod, 'id'>) => {
    setSaveStatus('saving');
    try {
      const { data: newPeriod, error } = await supabase
        .from('assessment_periods')
        .insert(period)
        .select()
        .single();
      if (error) throw error;
      setAssessmentPeriods(prev => [...prev, newPeriod].sort((a,b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()));
      setSaveStatus('success');
    } catch (err) {
      console.error("Failed to add assessment period:", err);
      const errorMessage = (err instanceof Error) ? err.message : 'Unknown error';
      setSaveStatus({ state: 'error', message: errorMessage });
    }
  };

  const addWard = async (wardName: string) => {
    setSaveStatus('saving');
    try {
        const newWardData = { id: wardName.toLowerCase().replace(/\s+/g, '-'), name: wardName };
        const { data: newWard, error } = await supabase.from('wards').insert(newWardData).select().single();
        if (error) throw error;
        setWards(prev => [...prev, newWard]);
        setSaveStatus('success');
    } catch(err) {
        console.error("Failed to add ward:", err);
        const errorMessage = (err instanceof Error) ? err.message : 'Unknown error';
        setSaveStatus({ state: 'error', message: errorMessage });
    }
  };


  const handleAdminSelectWard = (wardId: string) => {
    setAdminSelectedWardId(wardId);
    if (selectedStandardId === 'admin_page') {
      setSelectedStandardId('bab1');
    }
  };

  const handleReturnToDashboard = () => {
    setSelectedStandardId('admin_page');
  };
  
  const isViewingAsAdminDetail = currentUser.role === 'Admin' && adminSelectedWardId;
  const wardIdForDisplay = isViewingAsAdminDetail ? adminSelectedWardId : selectedWardId;
  const assessmentDataForDisplay = allAssessments[wardIdForDisplay!] || {};
  const adminSelectedWard = adminSelectedWardId ? wards.find(w => w.id === adminSelectedWardId) : null;

  return (
    <div className="flex h-screen font-sans antialiased">
      <Sidebar 
        standards={manruraData}
        selectedStandardId={selectedStandardId}
        setSelectedStandardId={setSelectedStandardId}
        currentUser={currentUser}
        wards={wards}
        selectedWardId={selectedWardId}
        setSelectedWardId={setSelectedWardId}
      />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-slate-100">
        {!isAssessmentActive && currentUser.role !== 'Admin' && (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 mb-6 rounded-r-lg" role="alert">
              <p className="font-bold">Periode Penilaian Tidak Aktif</p>
              <p>Anda hanya dapat melihat data. Perubahan tidak dapat disimpan.</p>
            </div>
        )}
        {currentUser.role === 'Admin' && (!adminSelectedWardId || selectedStandardId === 'admin_page') ? (
            <AdminDashboard 
                wards={wards} 
                allUsers={allUsers}
                allAssessments={allAssessments}
                manruraData={manruraData}
                assessmentPeriods={assessmentPeriods}
                onAddWard={addWard}
                onAddUser={addUser}
                onSelectWard={handleAdminSelectWard}
                onAddAssessmentPeriod={addAssessmentPeriod}
            />
        ) : isViewingAsAdminDetail && selectedStandard ? ( // Admin viewing specific ward
            <div>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                    <h2 className="text-2xl font-bold text-slate-800">
                    Hasil Audit: <span className="text-sky-700">{adminSelectedWard?.name}</span>
                    </h2>
                    <button 
                    onClick={handleReturnToDashboard}
                    className="flex items-center justify-center sm:justify-start px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 transition-colors text-sm font-medium"
                    >
                    <ArrowLeftIcon className="w-5 h-5 mr-2"/>
                    Kembali ke Dashboard
                    </button>
                </div>
                <ContentDisplay 
                    standard={selectedStandard}
                    currentUser={currentUser}
                    assessmentData={assessmentDataForDisplay}
                    onScoreChange={() => {}} // Read-only for Admin
                    users={allUsers}
                    isAssessmentActive={true} // Admin can always see content as if active
                />
            </div>
        ) : ( // Assessor or Ward Staff view
          <ContentDisplay 
            standard={selectedStandard}
            currentUser={currentUser}
            assessmentData={assessmentDataForDisplay}
            onScoreChange={handleScoreChange}
            users={allUsers}
            isAssessmentActive={isAssessmentActive}
          />
        )}
      </main>
      {apiKey && <Chatbot />}
      <SaveStatusIndicator status={saveStatus} />
    </div>
  );
};

export default AuthenticatedApp;