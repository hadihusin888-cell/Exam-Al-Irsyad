
import React, { useState, useEffect, useRef } from 'react';
import { ViewState, Student, ExamSession, StudentStatus, Room } from './types';
import StudentLogin from './views/StudentLogin';
import AdminLogin from './views/AdminLogin';
import AdminDashboard from './views/AdminDashboard';
import ProctorDashboard from './views/ProctorDashboard';
import ExamRoom from './views/ExamRoom';
import { fetchFromCloud, syncToCloud } from './services/databaseService';

const GAS_URL = "https://script.google.com/macros/s/AKfycby8Z8BdPpZ_dMhYFOFXdeBmdTVvBjBsY43FCXXw3vKmtFYCBdS7XH7t7F1pz5R9I97GbQ/exec"; 

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('STUDENT_LOGIN');
  const [currentUser, setCurrentUser] = useState<Student | null>(null);
  const [currentSession, setCurrentSession] = useState<ExamSession | null>(null);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);

  const lastKnownDataCount = useRef({ sessions: 0, students: 0, rooms: 0 });

  const normalizeData = (data: any) => {
    if (!data || typeof data !== 'object') return null;
    const rawStudents = data.students || data.STUDENTS;
    const rawSessions = data.sessions || data.SESSIONS;
    if (!rawStudents && !rawSessions) return null;

    const normalizedStudents = (rawStudents || []).map((s: any) => ({
      nis: String(s.nis || s.NIS || s.Nis || '').trim(),
      name: String(s.name || s.NAME || s.Nama || ''),
      class: String(s.class || s.CLASS || s.Kelas || ''),
      password: String(s.password || s.PASSWORD || s.Password || 'password123'),
      status: (s.status || s.STATUS || StudentStatus.BELUM_MASUK) as StudentStatus,
      roomId: String(s.roomId || s.ROOMID || s.RoomId || s.ruangId || '').trim()
    }));

    const normalizedRooms = (data.rooms || data.ROOMS || []).map((r: any) => ({
      id: String(r.id || r.ID || '').trim(),
      name: String(r.name || r.NAME || ''),
      capacity: Number(r.capacity || r.CAPACITY || 0),
      username: String(r.username || r.USERNAME || ''),
      password: String(r.password || r.PASSWORD || '')
    }));

    const normalizedSessions = (rawSessions || []).map((sess: any) => ({
      id: String(sess.id || sess.ID || ''),
      name: String(sess.name || sess.NAME || ''),
      class: String(sess.class || sess.CLASS || ''),
      pin: String(sess.pin || sess.PIN || ''),
      durationMinutes: Number(sess.durationMinutes || sess.DURATION || 60),
      isActive: sess.isActive === true || sess.isActive === 'TRUE' || sess.isActive === 'active',
      questions: [],
      pdfUrl: String(sess.pdfUrl || sess.PDFURL || '')
    }));

    return { students: normalizedStudents, rooms: normalizedRooms, sessions: normalizedSessions };
  };

  useEffect(() => {
    const initApp = async () => {
      let finalStudents: Student[] = [];
      let finalSessions: ExamSession[] = [];
      let finalRooms: Room[] = [];

      try {
        const savedStudents = localStorage.getItem('examsy_students');
        const savedSessions = localStorage.getItem('examsy_sessions');
        const savedRooms = localStorage.getItem('examsy_rooms');
        if (savedStudents) finalStudents = JSON.parse(savedStudents);
        if (savedSessions) finalSessions = JSON.parse(savedSessions);
        if (savedRooms) finalRooms = JSON.parse(savedRooms);
      } catch (e) {}

      if (GAS_URL && !GAS_URL.includes("dummy")) {
        try {
          const cloudData = await fetchFromCloud(GAS_URL);
          const normalized = normalizeData(cloudData);
          if (normalized && (normalized.sessions.length > 0 || normalized.students.length > 0)) {
            finalStudents = normalized.students;
            finalSessions = normalized.sessions;
            finalRooms = normalized.rooms;
          }
        } catch (e) {}
      }
      
      setStudents(finalStudents);
      setSessions(finalSessions);
      setRooms(finalRooms);
      lastKnownDataCount.current = { sessions: finalSessions.length, students: finalStudents.length, rooms: finalRooms.length };
      setIsLoading(false);
      setTimeout(() => setIsInitialLoadComplete(true), 1500);
    };

    initApp();

    const interval = setInterval(async () => {
      if (GAS_URL && !GAS_URL.includes("dummy") && !isSyncing && isInitialLoadComplete) {
        const cloudData = await fetchFromCloud(GAS_URL);
        const normalized = normalizeData(cloudData);
        if (normalized && (normalized.sessions.length > 0 || normalized.students.length > 0)) {
          setStudents(normalized.students);
          setSessions(normalized.sessions);
          setRooms(normalized.rooms);
          lastKnownDataCount.current = { sessions: normalized.sessions.length, students: normalized.students.length, rooms: normalized.rooms.length };
        }
      }
    }, 60000); // Poll every 1 minute to stay updated

    return () => clearInterval(interval);
  }, [isInitialLoadComplete, isSyncing]);

  // Global Sync Logic (Restricted)
  useEffect(() => {
    if (!isInitialLoadComplete || isLoading) return;
    if (lastKnownDataCount.current.sessions > 0 && sessions.length === 0) return;
    if (lastKnownDataCount.current.students > 0 && students.length === 0) return;

    localStorage.setItem('examsy_sessions', JSON.stringify(sessions));
    localStorage.setItem('examsy_students', JSON.stringify(students));
    localStorage.setItem('examsy_rooms', JSON.stringify(rooms));

    // PENTING: Jangan biarkan Proktor melakukan Full Sync (Overwrite) ke cloud.
    // Full Sync hanya boleh dilakukan oleh Admin atau saat inisialisasi.
    if (!GAS_URL || GAS_URL.includes("dummy") || view !== 'ADMIN_DASHBOARD') return;

    const syncTimer = setTimeout(async () => {
      setIsSyncing(true);
      const success = await syncToCloud(GAS_URL, { students, sessions, rooms });
      setIsSyncing(false);
      if (success) {
        lastKnownDataCount.current = { sessions: sessions.length, students: students.length, rooms: rooms.length };
      }
    }, 5000);

    return () => clearTimeout(syncTimer);
  }, [students, sessions, rooms, isInitialLoadComplete, isLoading, view]);

  const updateStudentStatus = (nis: string, status: StudentStatus) => {
    setStudents(prev => prev.map(s => s.nis === nis ? { ...s, status } : s));
  };

  const handleStudentLogin = (student: Student, session: ExamSession) => {
    if (!session || !student) return;
    setCurrentUser(student);
    setCurrentSession(session);
    updateStudentStatus(student.nis, StudentStatus.SEDANG_UJIAN);
    setView('EXAM_ROOM');
  };

  const handleStaffLogin = (role: 'ADMIN' | 'PROCTOR', targetRoom?: Room) => {
    if (role === 'ADMIN') setView('ADMIN_DASHBOARD');
    else if (role === 'PROCTOR' && targetRoom) {
      setActiveRoom(targetRoom);
      setView('PROCTOR_DASHBOARD');
    }
  };
  
  const handleExitExam = () => {
    if (currentUser) updateStudentStatus(currentUser.nis, StudentStatus.SELESAI);
    setCurrentUser(null);
    setCurrentSession(null);
    setView('STUDENT_LOGIN');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 font-sans">
        <div className="flex flex-col items-center gap-6">
          <div className="w-12 h-12 border-[6px] border-indigo-600 border-t-transparent rounded-full animate-spin shadow-lg"></div>
          <div className="text-center">
            <p className="text-white font-black text-xs uppercase tracking-[0.3em] mb-1">Examsy Core</p>
            <p className="text-slate-500 font-bold text-[9px] uppercase tracking-widest animate-pulse">Menghubungkan Database...</p>
          </div>
        </div>
      </div>
    );
  }

  const renderView = () => {
    switch (view) {
      case 'STUDENT_LOGIN': return <StudentLogin sessions={sessions} students={students} onLogin={handleStudentLogin} onAdminClick={() => setView('ADMIN_LOGIN')} />;
      case 'ADMIN_LOGIN': return <AdminLogin rooms={rooms} onLogin={handleStaffLogin} onBack={() => setView('STUDENT_LOGIN')} />;
      case 'ADMIN_DASHBOARD': return <AdminDashboard sessions={sessions} setSessions={setSessions} students={students} setStudents={setStudents} rooms={rooms} setRooms={setRooms} isSyncing={isSyncing} onLogout={() => setView('STUDENT_LOGIN')} />;
      case 'PROCTOR_DASHBOARD': return activeRoom ? <ProctorDashboard room={activeRoom} students={students} setStudents={setStudents} isSyncing={isSyncing} onLogout={() => { setActiveRoom(null); setView('STUDENT_LOGIN'); }} /> : null;
      case 'EXAM_ROOM': return currentUser && currentSession ? <ExamRoom student={currentUser} session={currentSession} onFinish={handleExitExam} /> : null;
      default: return <StudentLogin sessions={sessions} students={students} onLogin={handleStudentLogin} onAdminClick={() => setView('ADMIN_LOGIN')} />;
    }
  };

  return <div className="min-h-screen bg-slate-50">{renderView()}</div>;
};

export default App;
