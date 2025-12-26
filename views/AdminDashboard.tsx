
import React, { useState, useRef, useMemo } from 'react';
import { ExamSession, Student, StudentStatus, Room } from '../types';

interface AdminDashboardProps {
  sessions: ExamSession[];
  students: Student[];
  rooms: Room[];
  isSyncing: boolean;
  onLogout: () => void;
  onAction: (action: string, payload: any) => Promise<boolean>;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  sessions, students, rooms, isSyncing, onLogout, onAction 
}) => {
  const [activeTab, setActiveTab] = useState<'SESSIONS' | 'STUDENTS' | 'ROOMS'>('SESSIONS');
  
  // Modal states
  const [showAddSession, setShowAddSession] = useState(false);
  const [sessionToEdit, setSessionToEdit] = useState<ExamSession | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  const [studentToAdd, setStudentToAdd] = useState(false);
  const [selectedNis, setSelectedNis] = useState<string[]>([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [targetBulkRoomId, setTargetBulkRoomId] = useState('KEEP');
  const [targetBulkStatus, setTargetBulkStatus] = useState('KEEP');

  const [showAddRoom, setShowAddRoom] = useState(false);
  const [roomToEdit, setRoomToEdit] = useState<Room | null>(null);
  const [roomToDelete, setRoomToDelete] = useState<string | null>(null);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roomFilter, setRoomFilter] = useState('ALL');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Memoized Data
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const searchStr = searchTerm.toLowerCase();
      const nameMatch = (s.name || '').toLowerCase().includes(searchStr);
      const nisMatch = String(s.nis || '').includes(searchStr);
      const matchesSearch = nameMatch || nisMatch;
      const matchesRoom = roomFilter === 'ALL' || String(s.roomId || '').trim() === String(roomFilter).trim();
      return matchesSearch && matchesRoom;
    });
  }, [students, searchTerm, roomFilter]);

  const toggleSelectAllVisible = () => {
    const allVisibleSelected = filteredStudents.length > 0 && filteredStudents.every(s => selectedNis.includes(String(s.nis)));
    if (allVisibleSelected) {
      const visibleNis = filteredStudents.map(s => String(s.nis));
      setSelectedNis(prev => prev.filter(n => !visibleNis.includes(n)));
    } else {
      const visibleNis = filteredStudents.map(s => String(s.nis));
      setSelectedNis(prev => Array.from(new Set([...prev, ...visibleNis])));
    }
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',');
        if (row.length < 2) continue;
        const [nis, name, cls, roomName, pass, stat] = row;
        if (nis && name) {
          const targetRoom = rooms.find(r => 
            (r.name || '').toUpperCase() === (roomName || '').trim().toUpperCase()
          );
          await onAction('ADD_STUDENT', {
            nis: String(nis).trim(),
            name: String(name).trim().toUpperCase(),
            class: String(cls || "").trim(),
            roomId: targetRoom ? targetRoom.id : "",
            password: (pass || "password123").trim(),
            status: (stat || StudentStatus.BELUM_MASUK).trim()
          });
        }
      }
      alert(`Import data siswa sinkron.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const getStatusBadge = (status: StudentStatus) => {
    switch (status) {
      case StudentStatus.BELUM_MASUK: return <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">Belum Masuk</span>;
      case StudentStatus.SEDANG_UJIAN: return <span className="bg-amber-100 text-amber-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider animate-pulse">Sedang Ujian</span>;
      case StudentStatus.SELESAI: return <span className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">Selesai</span>;
      case StudentStatus.BLOKIR: return <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">Blokir</span>;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50 font-sans">
      <header className="bg-white border-b border-slate-200 px-6 md:px-10 py-5 flex items-center justify-between shrink-0 z-50">
        <div className="flex items-center gap-4 md:gap-10">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-600 rounded-lg md:rounded-xl flex items-center justify-center text-white font-black italic shadow-lg shadow-indigo-200">E</div>
             <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight hidden sm:block">Examsy Admin</h1>
          </div>
          <nav className="flex bg-slate-100 p-1 rounded-xl md:rounded-2xl">
            {(['SESSIONS', 'STUDENTS', 'ROOMS'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 md:px-6 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                {tab === 'SESSIONS' ? 'Ujian' : tab === 'STUDENTS' ? 'Siswa' : 'Ruang'}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 md:gap-6">
          <div className="flex items-center gap-2 md:gap-3 bg-slate-50 px-3 md:px-4 py-2 rounded-xl md:rounded-2xl border border-slate-100">
             <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${isSyncing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div>
             <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">{isSyncing ? 'Sync...' : 'Online'}</span>
          </div>
          <button onClick={onLogout} className="text-slate-400 hover:text-red-600 font-bold text-xs md:text-sm">Logout</button>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6 md:p-10 bg-[#f8fafc]">
        {/* SESI UJIAN */}
        {activeTab === 'SESSIONS' && (
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
              <div>
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">Sesi Ujian</h2>
                <p className="text-slate-400 font-medium text-xs md:text-sm mt-2 uppercase tracking-widest">Jadwal & Soal Sinkron</p>
              </div>
              <button onClick={() => setShowAddSession(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95"> + Sesi Baru </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {sessions.map(session => (
                <div key={session.id} className="bg-white p-8 md:p-10 rounded-[2.5rem] md:rounded-[3rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all group">
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="text-xl md:text-2xl font-black text-slate-900 uppercase">{session.name}</h3>
                    <button onClick={() => onAction('UPDATE_SESSION', { ...session, isActive: !session.isActive })} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${session.isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                      {session.isActive ? 'AKTIF' : 'OFF'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-8">
                     <span className="bg-indigo-50 text-indigo-600 text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-wider">Kls {session.class}</span>
                     <span className="bg-slate-50 text-slate-500 text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-wider">PIN: {session.pin}</span>
                     <span className="bg-slate-900 text-white text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-wider">{session.durationMinutes} Menit</span>
                  </div>
                  <div className="flex items-center gap-2 pt-6 border-t border-slate-50">
                    <button onClick={() => setSessionToEdit(session)} className="flex-1 bg-slate-100 hover:bg-indigo-600 hover:text-white text-indigo-600 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">EDIT</button>
                    <button onClick={() => setSessionToDelete(session.id)} className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all">
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DATABASE SISWA */}
        {activeTab === 'STUDENTS' && (
          <div className="max-w-7xl mx-auto pb-32">
             <div className="flex flex-col lg:flex-row justify-between lg:items-end mb-10 gap-6">
                <div>
                  <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">Database Siswa</h2>
                  <p className="text-slate-400 font-medium text-xs md:text-sm mt-2 uppercase tracking-widest">Database Terintegrasi ({students.length})</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <input type="text" placeholder="Cari Nama/NIS..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full lg:w-64 pl-6 pr-6 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:border-indigo-500 shadow-sm" />
                  <select value={roomFilter} onChange={(e) => setRoomFilter(e.target.value)} className="px-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none shadow-sm">
                    <option value="ALL">Semua Ruang</option>
                    <option value="">Tanpa Ruang</option>
                    {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                  <button onClick={() => setStudentToAdd(true)} className="bg-indigo-600 text-white px-5 py-3.5 rounded-2xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all"> + Siswa </button>
                  <button onClick={() => fileInputRef.current?.click()} className="bg-slate-900 text-white px-5 py-3.5 rounded-2xl font-black text-[10px] uppercase transition-all shadow-lg active:scale-95">Impor CSV</button>
                  <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleImportCSV} />
                </div>
             </div>

             <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[1000px]">
                  <thead className="bg-slate-50 text-slate-400 uppercase text-[9px] font-black tracking-widest border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-6 text-center w-16">
                        <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-indigo-600" onChange={toggleSelectAllVisible} checked={filteredStudents.length > 0 && filteredStudents.every(s => selectedNis.includes(String(s.nis)))} />
                      </th>
                      <th className="px-8 py-6">NIS</th>
                      <th className="px-8 py-6">Nama Siswa</th>
                      <th className="px-8 py-6">Kelas</th>
                      <th className="px-8 py-6">Ruang</th>
                      <th className="px-8 py-6">Password</th>
                      <th className="px-8 py-6 text-center">Status</th>
                      <th className="px-8 py-6 text-right pr-12">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map(student => (
                      <tr key={String(student.nis)} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-5 text-center">
                          <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-indigo-600" checked={selectedNis.includes(String(student.nis))} onChange={() => setSelectedNis(prev => prev.includes(String(student.nis)) ? prev.filter(n => n !== String(student.nis)) : [...prev, String(student.nis)])} />
                        </td>
                        <td className="px-8 py-5 font-mono text-indigo-600 text-[11px] font-black uppercase tracking-tight">{student.nis}</td>
                        <td className="px-8 py-5 font-black text-slate-800 tracking-tight uppercase text-xs">{student.name}</td>
                        <td className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase">Kls {student.class}</td>
                        <td className="px-8 py-5 text-[11px] font-black text-indigo-900 uppercase">{rooms.find(r => r.id === student.roomId)?.name || "-"}</td>
                        <td className="px-8 py-5 font-mono text-[10px] text-slate-400 group-hover:text-slate-800 transition-colors uppercase">{student.password}</td>
                        <td className="px-8 py-5 text-center">{getStatusBadge(student.status)}</td>
                        <td className="px-8 py-5 text-right pr-12">
                          <button onClick={() => setStudentToEdit(student)} className="text-indigo-600 font-black text-[9px] uppercase tracking-widest hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-all">EDIT</button>
                          <button onClick={async () => { if(confirm('Hapus siswa ini?')) await onAction('DELETE_STUDENT', { nis: student.nis }); }} className="text-red-400 font-black text-[9px] uppercase tracking-widest hover:bg-red-50 px-3 py-1.5 rounded-lg ml-2 transition-all">HAPUS</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
             </div>
          </div>
        )}

        {/* DATA RUANG */}
        {activeTab === 'ROOMS' && (
          <div className="max-w-7xl mx-auto">
             <div className="flex justify-between items-end mb-10">
                <div>
                  <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">Manajemen Ruang</h2>
                  <p className="text-slate-400 font-medium text-xs md:text-sm mt-2 uppercase tracking-widest">Total {rooms.length} Ruang Proktor</p>
                </div>
                <button onClick={() => setShowAddRoom(true)} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-xl transition-all"> + Tambah Ruang </button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {rooms.map(room => (
                  <div key={room.id} className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                    <h3 className="text-xl font-black text-slate-900 mb-4 uppercase tracking-tighter leading-none">{room.name}</h3>
                    <div className="space-y-2 mb-8">
                       <div className="flex justify-between items-center text-[10px] font-black uppercase">
                          <span className="text-slate-400">Login</span>
                          <span className="text-slate-700 font-mono">{room.username}</span>
                       </div>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                      <button onClick={() => setRoomToEdit(room)} className="text-indigo-600 font-black text-[10px] uppercase tracking-widest hover:underline">Edit Detail</button>
                      <button onClick={() => setRoomToDelete(room.id)} className="text-red-400 hover:text-red-600 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}
      </main>

      {/* MODALS */}
      {(studentToEdit || studentToAdd) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg p-10 rounded-[3rem] shadow-2xl animate-in zoom-in-95">
            <h3 className="text-2xl font-black text-slate-900 mb-8 uppercase tracking-tighter leading-none">{studentToEdit ? 'Ubah Siswa' : 'Tambah Siswa'}</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const data = {
                nis: (f.get('nis') as string).trim(),
                name: (f.get('name') as string).toUpperCase().trim(),
                class: f.get('class') as string,
                roomId: f.get('roomId') as string,
                password: ((f.get('password') as string) || "password123").trim(),
                status: studentToEdit ? studentToEdit.status : StudentStatus.BELUM_MASUK
              };
              const ok = await onAction(studentToEdit ? 'UPDATE_STUDENT' : 'ADD_STUDENT', data);
              if(ok) { setStudentToEdit(null); setStudentToAdd(false); }
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input name="nis" defaultValue={studentToEdit?.nis} readOnly={!!studentToEdit} required placeholder="NIS" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold uppercase outline-none focus:border-indigo-500" />
                <input name="password" defaultValue={studentToEdit?.password || 'password123'} required placeholder="PASSWORD" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-indigo-500" />
              </div>
              <input name="name" defaultValue={studentToEdit?.name} required placeholder="NAMA LENGKAP SISWA" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-indigo-500 uppercase" />
              <div className="grid grid-cols-2 gap-4">
                <select name="class" defaultValue={studentToEdit?.class || '7'} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-indigo-500">
                    <option value="7">Kls 7</option>
                    <option value="8">Kls 8</option>
                    <option value="9">Kls 9</option>
                </select>
                <select name="roomId" defaultValue={studentToEdit?.roomId || ''} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-indigo-500">
                    <option value="">Ruang: Kosong</option>
                    {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="pt-6 flex flex-col gap-2">
                 <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg">SIMPAN DATA</button>
                 <button type="button" onClick={() => { setStudentToEdit(null); setStudentToAdd(false); }} className="w-full text-slate-400 py-2 font-bold uppercase text-[10px]">Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {(showAddSession || sessionToEdit) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg p-10 rounded-[3rem] shadow-2xl animate-in zoom-in-95">
            <h3 className="text-2xl font-black text-slate-900 mb-8 uppercase tracking-tighter leading-none">{sessionToEdit ? 'Ubah Sesi' : 'Sesi Baru'}</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const ok = await onAction(sessionToEdit ? 'UPDATE_SESSION' : 'ADD_SESSION', {
                id: sessionToEdit?.id || `s-${Date.now()}`,
                name: (f.get('name') as string).toUpperCase().trim(),
                class: f.get('class') as string,
                pin: (f.get('pin') as string).trim(),
                durationMinutes: Number(f.get('duration')),
                isActive: sessionToEdit?.isActive || false,
                pdfUrl: (f.get('pdfUrl') as string).trim(),
                questions: []
              });
              if(ok) { setShowAddSession(false); setSessionToEdit(null); }
            }} className="space-y-4">
              <input name="name" defaultValue={sessionToEdit?.name} placeholder="NAMA UJIAN" required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-indigo-500 uppercase" />
              <div className="grid grid-cols-2 gap-4">
                <input name="pin" defaultValue={sessionToEdit?.pin} placeholder="PIN (4 DIGIT)" required maxLength={4} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-center font-mono font-black focus:border-indigo-500 outline-none" />
                <select name="class" defaultValue={sessionToEdit?.class || "7"} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:border-indigo-500 outline-none">
                    <option value="7">KLS 7</option>
                    <option value="8">KLS 8</option>
                    <option value="9">KLS 9</option>
                </select>
              </div>
              <input name="duration" type="number" defaultValue={sessionToEdit?.durationMinutes || 60} required placeholder="DURASI (MENIT)" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-indigo-500" />
              <input name="pdfUrl" defaultValue={sessionToEdit?.pdfUrl} placeholder="URL PDF SOAL (G-DRIVE)" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] outline-none focus:border-indigo-500" />
              <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg mt-6">SIMPAN SESI</button>
              <button type="button" onClick={() => { setShowAddSession(false); setSessionToEdit(null); }} className="w-full text-slate-400 font-bold uppercase text-[10px] py-2">Batal</button>
            </form>
          </div>
        </div>
      )}

      {(showAddRoom || roomToEdit) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md p-10 rounded-[3rem] shadow-2xl animate-in zoom-in-95">
            <h3 className="text-2xl font-black text-slate-900 mb-8 uppercase tracking-tighter leading-none">{roomToEdit ? 'Ubah Ruang' : 'Ruang Baru'}</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const ok = await onAction(roomToEdit ? 'UPDATE_ROOM' : 'ADD_ROOM', {
                id: roomToEdit?.id || `r-${Date.now()}`,
                name: (f.get('name') as string).toUpperCase().trim(),
                capacity: Number(f.get('capacity')),
                username: (f.get('username') as string).trim(),
                password: (f.get('password') as string).trim()
              });
              if(ok) { setShowAddRoom(false); setRoomToEdit(null); }
            }} className="space-y-4">
              <input name="name" defaultValue={roomToEdit?.name} placeholder="NAMA RUANG" required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold uppercase outline-none focus:border-indigo-500" />
              <div className="grid grid-cols-2 gap-4">
                <input name="capacity" type="number" defaultValue={roomToEdit?.capacity || 20} required placeholder="KAPASITAS" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-indigo-500" />
                <input name="username" defaultValue={roomToEdit?.username} placeholder="USERNAME" required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-indigo-500" />
              </div>
              <input name="password" defaultValue={roomToEdit?.password} placeholder="PASSWORD" required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-indigo-500" />
              <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg mt-6">SIMPAN RUANG</button>
              <button type="button" onClick={() => { setShowAddRoom(false); setRoomToEdit(null); }} className="w-full text-slate-400 font-bold uppercase text-[10px] py-2">Batal</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
