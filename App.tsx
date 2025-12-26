
import React, { useState, useEffect, useRef } from 'react';
import { ViewState, Student, ExamSession, StudentStatus, Room } from './types';
import StudentLogin from './views/StudentLogin';
import AdminLogin from './views/AdminLogin';
import AdminDashboard from './views/AdminDashboard';
import ProctorDashboard from './views/ProctorDashboard';
import ExamRoom from './views/ExamRoom';
import { fetchFromCloud, syncToCloud, updateStudentInCloud } from './services/databaseService';

const GAS_URL = "https://script.google.com/macros/s/AKfycbw-2xIPmBubGL3rq2OZDc0_1xB45F46fZNLUDo6VvCZs9OFTQRFnNjQkZkWlF1Gj6gM1w/exec"; 

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('STUDENT_LOGIN');
  const [currentUser, setCurrentUser] = useState<Student | null>(null);
  const [currentSession, setCurrentSession] = useState<ExamSession | null>(null);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCloudLoaded, setIsCloudLoaded] = useState(false);

  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);

  const lastCloudCount = useRef({ students: 0, sessions: 0, rooms: 0 });

  const normalizeData = (data: any) => {
    if (!data || typeof data !== 'object') return null;
    const s = data.students || [];
    const sess = data.sessions || [];
    const r = data.rooms || [];

    return {
      students: s.map((item: any) => ({
        nis: String(item.nis || '').trim(),
        name: String(item.name || ''),
        class: String(item.class || ''),
        password: String(item.password || 'password123'),
        status: (item.status || StudentStatus.BELUM_MASUK) as StudentStatus,
        roomId: String(item.roomId || '').trim()
      })),
      sessions: sess.map((item: any) => ({
        id: String(item.id || ''),
        name: String(item.name || ''),
        class: String(item.class || ''),
        pin: String(item.pin || ''),
        durationMinutes: Number(item.durationMinutes || 60),
        isActive: item.isActive === true || item.isActive === 'TRUE',
        questions: [],
        pdfUrl: String(item.pdfUrl || '')
      })),
      rooms: r.map((item: any) => ({
        id: String(item.id || ''),
        name: String(item.name || ''),
        capacity: Number(item.capacity || 0),
        username: String(item.username || ''),
        password: String(item.password || '')
      }))
    };
  };

  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      
      const localS = localStorage.getItem('examsy_students');
      const localSess = localStorage.getItem('examsy_sessions');
      const localR = localStorage.getItem('examsy_rooms');
      if (localS) setStudents(JSON.parse(localS));
      if (localSess) setSessions(JSON.parse(localSess));
      if (localR) setRooms(JSON.parse(localR));

      if (GAS_URL) {
        const cloudData = await fetchFromCloud(GAS_URL);
        const normalized = normalizeData(cloudData);
        if (normalized) {
          setStudents(normalized.students);
          setSessions(normalized.sessions);
          setRooms(normalized.rooms);
          lastCloudCount.current = {
            students: normalized.students.length,
            sessions: normalized.sessions.length,
            rooms: normalized.rooms.length
          };
          setIsCloudLoaded(true);
        }
      }
      setIsLoading(false);
    };
    initData();
  }, []);

  useEffect(() => {
    if (view === 'EXAM_ROOM' || !isCloudLoaded) return;

    const interval = setInterval(async () => {
      if (!isSyncing) {
        const cloudData = await fetchFromCloud(GAS_URL);
        const normalized = normalizeData(cloudData);
        if (normalized && view !== 'ADMIN_DASHBOARD') {
          setStudents(normalized.students);
          setSessions(normalized.sessions);
          setRooms(normalized.rooms);
        }
      }
    }, 45000); 

    return () => clearInterval(interval);
  }, [view, isSyncing, isCloudLoaded]);

  useEffect(() => {
    if (view !== 'ADMIN_DASHBOARD' || !isCloudLoaded) return;

    if (lastCloudCount.current.students > 0 && students.length === 0) return;

    const timer = setTimeout(async () => {
      setIsSyncing(true);
      const success = await syncToCloud(GAS_URL, { students, sessions, rooms });
      if (success) {
        localStorage.setItem('examsy_students', JSON.stringify(students));
        localStorage.setItem('examsy_sessions', JSON.stringify(sessions));
        localStorage.setItem('examsy_rooms', JSON.stringify(rooms));
      }
      setIsSyncing(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [students, sessions, rooms, view, isCloudLoaded]);

  const handleStudentLogin = async (student: Student, session: ExamSession) => {
    setCurrentUser(student);
    setCurrentSession(session);
    setStudents(prev => prev.map(s => s.nis === student.nis ? { ...s, status: StudentStatus.SEDANG_UJIAN } : s));
    await updateStudentInCloud(GAS_URL, student.nis, StudentStatus.SEDANG_UJIAN);
    setView('EXAM_ROOM');
  };

  const handleExitExam = async () => {
    if (currentUser) {
      setStudents(prev => prev.map(s => s.nis === currentUser.nis ? { ...s, status: StudentStatus.SELESAI } : s));
      await updateStudentInCloud(GAS_URL, currentUser.nis, StudentStatus.SELESAI);
    }
    setCurrentUser(null);
    setCurrentSession(null);
    setView('STUDENT_LOGIN');
  };

  if (isLoading && !isCloudLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-indigo-400 font-bold tracking-widest text-xs uppercase animate-pulse">Syncing Database...</p>
        </div>
      </div>
    );
  }

  const renderView = () => {
    switch (view) {
      case 'STUDENT_LOGIN': return <StudentLogin sessions={sessions} students={students} onLogin={handleStudentLogin} onAdminClick={() => setView('ADMIN_LOGIN')} />;
      case 'ADMIN_LOGIN': return <AdminLogin rooms={rooms} onLogin={(role, room) => { if(role==='ADMIN') setView('ADMIN_DASHBOARD'); else { setActiveRoom(room!); setView('PROCTOR_DASHBOARD'); } }} onBack={() => setView('STUDENT_LOGIN')} />;
      case 'ADMIN_DASHBOARD': return <AdminDashboard sessions={sessions} setSessions={setSessions} students={students} setStudents={setStudents} rooms={rooms} setRooms={setRooms} isSyncing={isSyncing} onLogout={() => setView('STUDENT_LOGIN')} />;
      case 'PROCTOR_DASHBOARD': return <ProctorDashboard gasUrl={GAS_URL} room={activeRoom!} students={students} setStudents={setStudents} isSyncing={isSyncing} onLogout={() => setView('STUDENT_LOGIN')} />;
      case 'EXAM_ROOM': return <ExamRoom student={currentUser!} session={currentSession!} onFinish={handleExitExam} />;
      default: return <StudentLogin sessions={sessions} students={students} onLogin={handleStudentLogin} onAdminClick={() => setView('ADMIN_LOGIN')} />;
    }
  };

  return <div className="min-h-screen bg-slate-50">{renderView()}</div>;
};

export default App;
