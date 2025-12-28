
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { ViewState, Student, ExamSession, StudentStatus, Room } from './types';
import { fetchFromCloud, callCloudAction } from './services/databaseService';

const StudentLogin = lazy(() => import('./views/StudentLogin'));
const AdminLogin = lazy(() => import('./views/AdminLogin'));
const AdminDashboard = lazy(() => import('./views/AdminDashboard'));
const ProctorDashboard = lazy(() => import('./views/ProctorDashboard'));
const ExamRoom = lazy(() => import('./views/ExamRoom'));

const GAS_URL = "https://script.google.com/macros/s/AKfycbxJbQdOa7nhOpKlBwcdjpOCpEdcN4YFjUaCTS376dUS1ttJZe6Ii9AS3z5ECfTKuVf7ig/exec"; 

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('STUDENT_LOGIN');
  const [currentUser, setCurrentUser] = useState<Student | null>(null);
  const [currentSession, setCurrentSession] = useState<ExamSession | null>(null);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorDetail, setErrorDetail] = useState('');

  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);

  const loadAllData = async () => {
    if (!GAS_URL) return;
    
    setIsSyncing(true);
    const cloudData = await fetchFromCloud(GAS_URL);
    
    if (cloudData) {
      setStudents(cloudData.students || []);
      setSessions(cloudData.sessions || []);
      setRooms(cloudData.rooms || []);
      localStorage.setItem('examsy_backup', JSON.stringify(cloudData));
      setHasError(false);
      setErrorDetail('');
    } else {
      const backup = localStorage.getItem('examsy_backup');
      if (backup) {
        const parsed = JSON.parse(backup);
        setStudents(parsed.students || []);
        setSessions(parsed.sessions || []);
        setRooms(parsed.rooms || []);
      }
      setHasError(true);
      setErrorDetail('Gagal terhubung ke Cloud. Pastikan internet aktif.');
    }
    setIsLoading(false);
    setIsSyncing(false);
  };

  useEffect(() => {
    loadAllData();
    const intervalTime = (view === 'EXAM_ROOM' || view === 'PROCTOR_DASHBOARD' || view === 'ADMIN_DASHBOARD') ? 15000 : 60000;
    const interval = setInterval(() => {
      loadAllData();
    }, intervalTime);
    return () => clearInterval(interval);
  }, [view]);

  const handleAction = async (action: string, payload: any) => {
    // Optimistic Update: Langsung update state lokal agar UI terasa instan
    if (action === 'UPDATE_STUDENT') {
      setStudents(prev => prev.map(s => 
        String(s.nis) === String(payload.nis) ? { ...s, ...payload } : s
      ));
    }

    setIsSyncing(true);
    const success = await callCloudAction(GAS_URL, action, payload);
    
    // Refresh data untuk memastikan state tetap akurat dengan server
    if (success) {
      await loadAllData();
    } else {
      // Revert/Refresh jika gagal
      await loadAllData();
    }
    
    setIsSyncing(false);
    return success;
  };

  const handleStudentLogin = async (student: Student, session: ExamSession) => {
    setCurrentUser(student);
    setCurrentSession(session);
    await handleAction('UPDATE_STUDENT', { ...student, status: StudentStatus.SEDANG_UJIAN });
    setView('EXAM_ROOM');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-10 text-center">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-6"></div>
        <h2 className="text-white font-black uppercase tracking-widest text-[10px]">Menghubungkan ke Database...</h2>
        {hasError && <p className="text-red-400 text-[10px] mt-4 font-bold">{errorDetail}</p>}
        {hasError && (
          <button 
            onClick={() => { setIsLoading(true); loadAllData(); }} 
            className="mt-6 bg-white/10 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"
          >
            Coba Lagi
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">
      {hasError && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-red-600 text-white py-2 px-4 text-center text-[10px] font-black uppercase tracking-widest animate-in slide-in-from-top duration-500">
          ⚠️ Masalah Koneksi. Menggunakan Data Terakhir.
          <button onClick={() => loadAllData()} className="ml-4 underline">Segarkan</button>
        </div>
      )}
      
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-3 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin"></div></div>}>
        {view === 'STUDENT_LOGIN' && <StudentLogin sessions={sessions} students={students} onLogin={handleStudentLogin} onAdminClick={() => setView('ADMIN_LOGIN')} />}
        {view === 'ADMIN_LOGIN' && <AdminLogin rooms={rooms} onLogin={(role, r) => { if(role==='ADMIN') setView('ADMIN_DASHBOARD'); else { setActiveRoom(r!); setView('PROCTOR_DASHBOARD'); } }} onBack={() => setView('STUDENT_LOGIN')} />}
        {view === 'ADMIN_DASHBOARD' && <AdminDashboard sessions={sessions} students={students} rooms={rooms} isSyncing={isSyncing} onLogout={() => setView('STUDENT_LOGIN')} onAction={handleAction} />}
        {view === 'PROCTOR_DASHBOARD' && activeRoom && <ProctorDashboard room={activeRoom} students={students} isSyncing={isSyncing} onLogout={() => setView('STUDENT_LOGIN')} onAction={handleAction} gasUrl={GAS_URL} />}
        {view === 'EXAM_ROOM' && currentUser && currentSession && <ExamRoom student={currentUser} students={students} session={currentSession} onFinish={() => { setCurrentUser(null); setCurrentSession(null); setView('STUDENT_LOGIN'); }} />}
      </Suspense>
    </div>
  );
};

export default App;
