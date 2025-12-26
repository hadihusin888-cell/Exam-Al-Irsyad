
import React, { useState, useEffect, useRef } from 'react';
import { ViewState, Student, ExamSession, StudentStatus, Room } from './types';
import StudentLogin from './views/StudentLogin';
import AdminLogin from './views/AdminLogin';
import AdminDashboard from './views/AdminDashboard';
import ProctorDashboard from './views/ProctorDashboard';
import ExamRoom from './views/ExamRoom';
import { fetchFromCloud, syncToCloud } from './services/databaseService';

// PASTIKAN URL INI ADALAH URL "WEB APP" YANG SUDAH DI-DEPLOY (Bukan URL Editor)
const GAS_URL = "https://script.google.com/macros/s/AKfycbwVzh9w1AcyfXefqRD0A-JUJ_zf9pyTi8EuTbVT572XTjggL5U7TRtCV0VMcGjxF1MEhA/exec"; 

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('STUDENT_LOGIN');
  const [currentUser, setCurrentUser] = useState<Student | null>(null);
  const [currentSession, setCurrentSession] = useState<ExamSession | null>(null);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  
  // Status Database & Sync
  const [isLoading, setIsLoading] = useState(true);
  const [isDatabaseReady, setIsDatabaseReady] = useState(false); 
  const [isSyncing, setIsSyncing] = useState(false);

  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);

  const lastCloudHash = useRef<string>("");

  const normalizeData = (data: any) => {
    if (!data || typeof data !== 'object') return null;
    const rawStudents = data.students || data.STUDENTS || [];
    const rawSessions = data.sessions || data.SESSIONS || [];
    const rawRooms = data.rooms || data.ROOMS || [];

    return {
      students: rawStudents.map((s: any) => ({
        nis: String(s.nis || s.NIS || '').trim(),
        name: String(s.name || s.Nama || ''),
        class: String(s.class || s.Kelas || ''),
        password: String(s.password || 'password123'),
        status: (String(s.status || s.Status || StudentStatus.BELUM_MASUK).trim()) as StudentStatus,
        roomId: String(s.roomId || s.ruangId || '').trim()
      })),
      sessions: rawSessions.map((sess: any) => ({
        id: String(sess.id || ''),
        name: String(sess.name || ''),
        class: String(sess.class || ''),
        pin: String(sess.pin || ''),
        durationMinutes: Number(sess.durationMinutes || 60),
        isActive: sess.isActive === true || sess.isActive === 'TRUE',
        questions: [],
        pdfUrl: String(sess.pdfUrl || '')
      })),
      rooms: rawRooms.map((r: any) => ({
        id: String(r.id || '').trim(),
        name: String(r.name || '').toUpperCase(),
        capacity: Number(r.capacity || 0),
        username: String(r.username || ''),
        password: String(r.password || '')
      }))
    };
  };

  useEffect(() => {
    const initApp = async () => {
      setIsLoading(true);
      if (GAS_URL) {
        const cloudData = await fetchFromCloud(GAS_URL);
        const normalized = normalizeData(cloudData);
        if (normalized) {
          setStudents(normalized.students);
          setSessions(normalized.sessions);
          setRooms(normalized.rooms);
          lastCloudHash.current = JSON.stringify(normalized);
          setIsDatabaseReady(true);
        } else {
          setIsDatabaseReady(true);
        }
      }
      setIsLoading(false);
    };
    initApp();
  }, []);

  // Sync Otomatis hanya di Dashboard Admin
  useEffect(() => {
    if (!isDatabaseReady || view !== 'ADMIN_DASHBOARD' || isSyncing) return;

    const currentData = { students, sessions, rooms };
    const currentHash = JSON.stringify(currentData);

    if (currentHash === lastCloudHash.current) return;
    if (students.length === 0 && JSON.parse(lastCloudHash.current || "{}").students?.length > 0) return;

    const timer = setTimeout(async () => {
      setIsSyncing(true);
      const success = await syncToCloud(GAS_URL, currentData);
      if (success) lastCloudHash.current = currentHash;
      setIsSyncing(false);
    }, 4000);

    return () => clearTimeout(timer);
  }, [students, sessions, rooms, isDatabaseReady, view]);

  const handleStudentLogin = (student: Student, session: ExamSession) => {
    setCurrentUser(student);
    setCurrentSession(session);
    setStudents(prev => prev.map(s => s.nis === student.nis ? { ...s, status: StudentStatus.SEDANG_UJIAN } : s));
    setView('EXAM_ROOM');
  };

  const renderView = () => {
    switch (view) {
      case 'STUDENT_LOGIN': return <StudentLogin sessions={sessions} students={students} onLogin={handleStudentLogin} onAdminClick={() => setView('ADMIN_LOGIN')} />;
      case 'ADMIN_LOGIN': return <AdminLogin rooms={rooms} onLogin={(role, r) => { if(role==='ADMIN') setView('ADMIN_DASHBOARD'); else { setActiveRoom(r!); setView('PROCTOR_DASHBOARD'); } }} onBack={() => setView('STUDENT_LOGIN')} />;
      case 'ADMIN_DASHBOARD': return <AdminDashboard sessions={sessions} setSessions={setSessions} students={students} setStudents={setStudents} rooms={rooms} setRooms={setRooms} isSyncing={isSyncing} onLogout={() => setView('STUDENT_LOGIN')} />;
      case 'PROCTOR_DASHBOARD': return activeRoom ? <ProctorDashboard gasUrl={GAS_URL} room={activeRoom} students={students} setStudents={setStudents} isSyncing={isSyncing} onLogout={() => setView('STUDENT_LOGIN')} /> : null;
      case 'EXAM_ROOM': return currentUser && currentSession ? <ExamRoom student={currentUser} session={currentSession} onFinish={() => setView('STUDENT_LOGIN')} /> : null;
      default: return null;
    }
  };

  return <div className="min-h-screen bg-slate-50">{renderView()}</div>;
};

export default App;
