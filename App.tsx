
import React, { useState, useEffect, useRef } from 'react';
import { ViewState, Student, ExamSession, StudentStatus, Room } from './types';
import StudentLogin from './views/StudentLogin';
import AdminLogin from './views/AdminLogin';
import AdminDashboard from './views/AdminDashboard';
import ProctorDashboard from './views/ProctorDashboard';
import ExamRoom from './views/ExamRoom';
import { fetchFromCloud, callCloudAction } from './services/databaseService';

const GAS_URL = "https://script.google.com/macros/s/AKfycbxJbQdOa7nhOpKlBwcdjpOCpEdcN4YFjUaCTS376dUS1ttJZe6Ii9AS3z5ECfTKuVf7ig/exec"; 

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('STUDENT_LOGIN');
  const [currentUser, setCurrentUser] = useState<Student | null>(null);
  const [currentSession, setCurrentSession] = useState<ExamSession | null>(null);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);

  const loadAllData = async () => {
    if (!GAS_URL) return;
    const cloudData = await fetchFromCloud(GAS_URL);
    if (cloudData) {
      setStudents(cloudData.students || []);
      setSessions(cloudData.sessions || []);
      setRooms(cloudData.rooms || []);
      localStorage.setItem('examsy_backup', JSON.stringify(cloudData));
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadAllData();
    // Refresh otomatis setiap 60 detik untuk sinkronisasi latar belakang
    const interval = setInterval(() => {
      if (view === 'ADMIN_DASHBOARD' || view === 'PROCTOR_DASHBOARD') {
        loadAllData();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [view]);

  /**
   * handleAction dipercepat dengan melakukan pembaruan state lokal seketika (Optimistic UI)
   * dan kemudian memaksa refresh data dari cloud setelah aksi selesai untuk memastikan sinkronisasi.
   */
  const handleAction = async (action: string, payload: any) => {
    setIsSyncing(true);
    
    // 1. Update State Lokal Secara Instan (Optimistic)
    // Memastikan NIS selalu string untuk perbandingan yang akurat
    const normalizedPayload = { ...payload };
    if (normalizedPayload.nis) normalizedPayload.nis = String(normalizedPayload.nis);

    switch(action) {
      case 'ADD_STUDENT': setStudents(prev => [...prev, normalizedPayload]); break;
      case 'UPDATE_STUDENT': setStudents(prev => prev.map(s => String(s.nis) === normalizedPayload.nis ? { ...s, ...normalizedPayload } : s)); break;
      case 'DELETE_STUDENT': setStudents(prev => prev.filter(s => String(s.nis) !== normalizedPayload.nis)); break;
      
      case 'ADD_SESSION': setSessions(prev => [...prev, normalizedPayload]); break;
      case 'UPDATE_SESSION': setSessions(prev => prev.map(s => s.id === normalizedPayload.id ? { ...s, ...normalizedPayload } : s)); break;
      case 'DELETE_SESSION': setSessions(prev => prev.filter(s => s.id !== normalizedPayload.id)); break;
      
      case 'ADD_ROOM': setRooms(prev => [...prev, normalizedPayload]); break;
      case 'UPDATE_ROOM': setRooms(prev => prev.map(r => r.id === normalizedPayload.id ? { ...r, ...normalizedPayload } : r)); break;
      case 'DELETE_ROOM': setRooms(prev => prev.filter(r => r.id !== normalizedPayload.id)); break;
      
      case 'BULK_UPDATE_STUDENTS':
        setStudents(prev => prev.map(s => {
          if (normalizedPayload.selectedNis.includes(String(s.nis))) {
            return { ...s, ...normalizedPayload.updates };
          }
          return s;
        }));
        break;
    }

    // 2. Kirim ke Cloud
    const success = await callCloudAction(GAS_URL, action, normalizedPayload);
    
    // 3. Paksa refresh data dari database asli untuk sinkronisasi sempurna
    if (success) {
      await loadAllData();
    } else {
      alert("Gagal sinkronisasi ke cloud. Perubahan mungkin tidak tersimpan permanen.");
      await loadAllData(); // Revert ke data cloud terakhir jika gagal
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
        <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-6"></div>
        <h2 className="text-white font-black uppercase tracking-widest text-sm">Menghubungkan ke Database...</h2>
      </div>
    );
  }

  const renderView = () => {
    switch (view) {
      case 'STUDENT_LOGIN': return <StudentLogin sessions={sessions} students={students} onLogin={handleStudentLogin} onAdminClick={() => setView('ADMIN_LOGIN')} />;
      case 'ADMIN_LOGIN': return <AdminLogin rooms={rooms} onLogin={(role, r) => { if(role==='ADMIN') setView('ADMIN_DASHBOARD'); else { setActiveRoom(r!); setView('PROCTOR_DASHBOARD'); } }} onBack={() => setView('STUDENT_LOGIN')} />;
      case 'ADMIN_DASHBOARD': 
        return <AdminDashboard 
          sessions={sessions} 
          students={students} 
          rooms={rooms} 
          isSyncing={isSyncing} 
          onLogout={() => setView('STUDENT_LOGIN')} 
          onAction={handleAction}
        />;
      case 'PROCTOR_DASHBOARD': 
        return activeRoom ? <ProctorDashboard 
          gasUrl={GAS_URL} 
          room={activeRoom} 
          students={students} 
          isSyncing={isSyncing} 
          onLogout={() => setView('STUDENT_LOGIN')} 
          onAction={handleAction}
        /> : null;
      case 'EXAM_ROOM': 
        return currentUser && currentSession ? <ExamRoom 
          student={currentUser} 
          session={currentSession} 
          onFinish={async () => {
            await handleAction('UPDATE_STUDENT', { ...currentUser, status: StudentStatus.SELESAI });
            setView('STUDENT_LOGIN');
          }} 
        /> : null;
      default: return null;
    }
  };

  return <div className="min-h-screen bg-slate-50">{renderView()}</div>;
};

export default App;
