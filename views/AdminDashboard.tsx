
import React, { useState, useRef, useMemo } from 'react';
import { ExamSession, Student, StudentStatus, Room } from '../types';

interface AdminDashboardProps {
  sessions: ExamSession[];
  setSessions: React.Dispatch<React.SetStateAction<ExamSession[]>>;
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  rooms: Room[];
  setRooms: React.Dispatch<React.SetStateAction<Room[]>>;
  isSyncing: boolean;
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  sessions, setSessions, 
  students, setStudents, 
  rooms, setRooms, 
  isSyncing,
  onLogout 
}) => {
  const [activeTab, setActiveTab] = useState<'SESSIONS' | 'STUDENTS' | 'ROOMS'>('SESSIONS');
  
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [sessionToEdit, setSessionToEdit] = useState<ExamSession | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  const [roomToDelete, setRoomToDelete] = useState<string | null>(null);
  const [roomToEdit, setRoomToEdit] = useState<Room | null>(null);
  
  // Preview PDF State
  const [hoveredPdf, setHoveredPdf] = useState<string | null>(null);

  // Selection State
  const [selectedNis, setSelectedNis] = useState<string[]>([]);
  const [showBulkRoomModal, setShowBulkRoomModal] = useState(false);
  const [targetBulkRoomId, setTargetBulkRoomId] = useState('KEEP');
  const [targetBulkStatus, setTargetBulkStatus] = useState('KEEP');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [roomFilter, setRoomFilter] = useState('ALL');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Normalisasi filter siswa
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const nameStr = String(s.name || '').toLowerCase();
      const nisStr = String(s.nis || '').toLowerCase();
      const searchStr = searchTerm.toLowerCase();
      
      const matchesSearch = nameStr.includes(searchStr) || nisStr.includes(searchStr);
      const matchesRoom = roomFilter === 'ALL' || String(s.roomId || '').trim() === String(roomFilter).trim();
      return matchesSearch && matchesRoom;
    });
  }, [students, searchTerm, roomFilter]);

  const allVisibleSelected = useMemo(() => {
    return filteredStudents.length > 0 && filteredStudents.every(s => selectedNis.includes(String(s.nis)));
  }, [filteredStudents, selectedNis]);

  const toggleSelectStudent = (nis: any) => {
    const nisStr = String(nis || '').trim();
    if (!nisStr) return;
    setSelectedNis(prev => 
      prev.includes(nisStr) ? prev.filter(n => n !== nisStr) : [...prev, nisStr]
    );
  };

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      const visibleNis = filteredStudents.map(s => String(s.nis));
      setSelectedNis(prev => prev.filter(n => !visibleNis.includes(n)));
    } else {
      const visibleNis = filteredStudents.map(s => String(s.nis));
      setSelectedNis(prev => Array.from(new Set([...prev, ...visibleNis])));
    }
  };

  const handleApplyBulkRoom = () => {
    setStudents(prev => prev.map(s => {
      if (selectedNis.includes(String(s.nis))) {
        let updatedStudent = { ...s };
        if (targetBulkRoomId !== 'KEEP') {
          updatedStudent.roomId = targetBulkRoomId ? String(targetBulkRoomId).trim() : undefined;
        }
        if (targetBulkStatus !== 'KEEP') {
          updatedStudent.status = targetBulkStatus as StudentStatus;
        }
        return updatedStudent;
      }
      return s;
    }));
    
    setSelectedNis([]);
    setShowBulkRoomModal(false);
    setTargetBulkRoomId('KEEP');
    setTargetBulkStatus('KEEP');
  };

  const handleToggleSession = (id: string) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s));
  };

  const handleDeleteSession = () => {
    if (sessionToDelete) {
      setSessions(prev => prev.filter(s => s.id !== sessionToDelete));
      setSessionToDelete(null);
    }
  };

  const handleSaveNewSession = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const newSession: ExamSession = {
      id: `s-${Date.now()}`,
      name: formData.get('name') as string,
      class: formData.get('class') as string,
      pin: formData.get('pin') as string,
      durationMinutes: parseInt(formData.get('duration') as string),
      isActive: false,
      questions: [],
      pdfUrl: formData.get('pdfUrl') as string
    };
    setSessions(prev => [...prev, newSession]);
    setShowAddModal(false);
  };

  const handleSaveEditSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (sessionToEdit) {
      setSessions(prev => prev.map(s => s.id === sessionToEdit.id ? sessionToEdit : s));
      setSessionToEdit(null);
    }
  };

  const handleSaveNewRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const newRoom: Room = {
      id: `r-${Date.now()}`,
      name: (formData.get('name') as string).toUpperCase().trim(),
      capacity: parseInt(formData.get('capacity') as string),
      username: (formData.get('username') as string) || `proktor_${Date.now()}`,
      password: (formData.get('password') as string) || 'proktor123'
    };
    setRooms(prev => [...prev, newRoom]);
    setShowAddRoomModal(false);
  };

  const handleSaveNewStudent = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const nis = String(formData.get('nis')).trim();
    
    // Validasi Duplikat NIS
    if (students.some(s => String(s.nis).trim() === nis)) {
      alert(`NIS ${nis} sudah terdaftar di database!`);
      return;
    }

    const newStudent: Student = {
      nis: nis,
      name: formData.get('name') as string,
      class: formData.get('class') as string,
      password: (formData.get('password') as string) || 'password123',
      status: StudentStatus.BELUM_MASUK,
      roomId: formData.get('roomId') ? String(formData.get('roomId')).trim() : undefined
    };

    setStudents(prev => [...prev, newStudent]);
    setShowAddStudentModal(false);
  };

  const handleSaveEditRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomToEdit) {
      setRooms(prev => prev.map(r => r.id === roomToEdit.id ? { ...roomToEdit, name: roomToEdit.name.toUpperCase().trim() } : r));
      setRoomToEdit(null);
    }
  };

  const handleDeleteRoom = () => {
    if (roomToDelete) {
      setRooms(prev => prev.filter(r => String(r.id).trim() !== String(roomToDelete).trim()));
      setStudents(prev => prev.map(s => String(s.roomId || '').trim() === String(roomToDelete).trim() ? { ...s, roomId: undefined } : s));
      setRoomToDelete(null);
    }
  };

  const handleDownloadTemplate = () => {
    const headers = "NIS,Nama,Kelas,RuangID,Password,Status\n";
    const sampleData = "4511,Ahmad Zakaria,7,RUANG 01,password123,BELUM_MASUK\n2024002,Siti Aminah,8,RUANG 02,password456,BELUM_MASUK\n";
    const blob = new Blob([headers + sampleData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template_siswa_examsy.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const newStudents: Student[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const [nis, name, cls, roomName, pass, stat] = line.split(',');
        if (nis && name && cls) {
          const targetRoom = rooms.find(r => 
            r.name.trim().toUpperCase() === (roomName || '').trim().toUpperCase()
          );
          newStudents.push({
            nis: String(nis).trim(),
            name: String(name).trim(),
            class: String(cls).trim(),
            roomId: targetRoom ? String(targetRoom.id).trim() : undefined,
            password: (pass || 'password123').trim(),
            status: (stat as StudentStatus) || StudentStatus.BELUM_MASUK
          });
        }
      }

      if (newStudents.length > 0) {
        setStudents(prev => {
          const filteredPrev = prev.filter(p => !newStudents.some(n => String(n.nis) === String(p.nis)));
          return [...filteredPrev, ...newStudents];
        });
        alert(`Berhasil mengimpor ${newStudents.length} siswa.`);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
      <header className="bg-white border-b border-slate-200 px-10 py-5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black italic shadow-lg shadow-indigo-200">E</div>
             <h1 className="text-xl font-black text-slate-900 tracking-tight">Examsy Super Admin</h1>
          </div>
          <nav className="flex bg-slate-100 p-1.5 rounded-2xl">
            {(['SESSIONS', 'STUDENTS', 'ROOMS'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setSelectedNis([]); }}
                className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {tab === 'SESSIONS' ? 'Sesi Ujian' : tab === 'STUDENTS' ? 'Database Siswa' : 'Data Ruang'}
              </button>
            ))}
          </nav>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
             <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div>
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
               {isSyncing ? 'Syncing...' : 'Connected'}
             </span>
          </div>
          <button onClick={onLogout} className="flex items-center gap-2 text-slate-400 hover:text-red-600 font-bold text-sm transition-all">
            <span>Logout</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-10 relative">
        {activeTab === 'SESSIONS' && (
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-3xl font-black text-slate-900">Manajemen Sesi</h2>
              <button onClick={() => setShowAddModal(true)} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all">
                + Buat Ujian Baru
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {sessions.map(session => (
                <div key={session.id} className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm transition-all hover:shadow-xl group relative">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight">{session.name}</h3>
                      <div className="flex items-center gap-3 mt-3">
                        <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">Kelas {session.class}</span>
                        <div className="flex items-center gap-1 ml-4 bg-slate-50 px-2 py-1 rounded-md">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">PIN:</span>
                          <span className="text-[10px] text-indigo-600 font-black font-mono">{session.pin}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                       <button onClick={() => handleToggleSession(session.id)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase border transition-all ${session.isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                        {session.isActive ? 'Aktif' : 'Nonaktif'}
                      </button>
                      <div className="flex gap-2">
                         <button 
                            onClick={() => setSessionToEdit(session)} 
                            className="p-2.5 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-xl transition-all"
                         >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                         </button>
                         <button 
                            onClick={() => setSessionToDelete(session.id)} 
                            className="p-2.5 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded-xl transition-all"
                         >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                         </button>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-8 border-t border-slate-50 pt-8">
                    <div>
                      <p className="text-[10px] text-slate-400 font-black uppercase mb-1">Durasi</p>
                      <p className="text-sm font-bold text-slate-700">{session.durationMinutes} Menit</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-black uppercase mb-1">Soal PDF</p>
                      <a 
                        href={session.pdfUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        onMouseEnter={() => session.pdfUrl && setHoveredPdf(session.pdfUrl)}
                        onMouseLeave={() => setHoveredPdf(null)}
                        className="text-sm font-bold text-indigo-600 hover:underline truncate block"
                      >
                        Lihat Dokumen
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'STUDENTS' && (
          <div className="max-w-7xl mx-auto pb-32">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
                <h2 className="text-3xl font-black text-slate-900">Database Siswa</h2>
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
                  <select value={roomFilter} onChange={(e) => setRoomFilter(e.target.value)} className="px-4 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:border-indigo-500 outline-none">
                    <option value="ALL">Semua Ruang</option>
                    {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    <option value="">Tanpa Ruang</option>
                  </select>
                  <input type="text" placeholder="Cari Nama atau NIS..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full md:w-64 pl-4 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:border-indigo-500 outline-none shadow-sm" />
                  <button onClick={() => setShowAddStudentModal(true)} className="bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase shadow-lg shadow-indigo-100">+ Tambah Siswa</button>
                  <button onClick={() => fileInputRef.current?.click()} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-xl">Impor CSV</button>
                  <button onClick={handleDownloadTemplate} className="bg-white border border-slate-200 text-slate-400 p-4 rounded-2xl hover:text-slate-600 transition-colors" title="Download Template CSV">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  </button>
                  <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleImportCSV} />
                </div>
             </div>
             
             <div className="bg-white rounded-[3rem] border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black tracking-widest border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-6 text-center w-20">
                        <div className="flex items-center justify-center h-full">
                          <input 
                            type="checkbox" 
                            checked={allVisibleSelected} 
                            onChange={toggleSelectAllVisible} 
                            className="w-5 h-5 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" 
                          />
                        </div>
                      </th>
                      <th className="px-6 py-6">NIS</th>
                      <th className="px-10 py-6">Nama</th>
                      <th className="px-10 py-6 text-center">Kelas</th>
                      <th className="px-10 py-6">Ruang</th>
                      <th className="px-10 py-6 text-center">Status</th>
                      <th className="px-10 py-6 text-right pr-14">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.length === 0 && (
                      <tr><td colSpan={7} className="px-10 py-20 text-center text-slate-400 italic">Data tidak ditemukan.</td></tr>
                    )}
                    {filteredStudents.map(student => (
                      <tr key={String(student.nis)} className={`hover:bg-slate-50/50 transition-colors ${selectedNis.includes(String(student.nis)) ? 'bg-indigo-50/40' : ''}`}>
                        <td className="px-6 py-6 text-center">
                          <div className="flex items-center justify-center h-full">
                            <input 
                              type="checkbox" 
                              checked={selectedNis.includes(String(student.nis))} 
                              onChange={() => toggleSelectStudent(student.nis)} 
                              className="w-5 h-5 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" 
                            />
                          </div>
                        </td>
                        <td className="px-6 py-6 font-mono text-xs font-bold text-indigo-600">{student.nis}</td>
                        <td className="px-10 py-6 font-bold text-slate-800 text-sm">{student.name}</td>
                        <td className="px-10 py-6 text-center text-[10px] font-black text-slate-400 uppercase">Kelas {student.class}</td>
                        <td className="px-10 py-6 font-bold text-slate-600 text-xs">
                          {rooms.find(r => String(r.id).trim() === String(student.roomId || '').trim())?.name || <span className="text-slate-300 italic">Belum diatur</span>}
                        </td>
                        <td className="px-10 py-6 text-center">{getStatusBadge(student.status)}</td>
                        <td className="px-10 py-6 text-right pr-10">
                           <div className="flex gap-4 justify-end">
                              <button onClick={() => setStudentToEdit(student)} className="text-indigo-600 font-bold text-xs uppercase hover:underline">Ubah</button>
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </div>
        )}

        {/* Floating Bulk Action Bar */}
        {selectedNis.length > 0 && activeTab === 'STUDENTS' && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[60] flex animate-in fade-in slide-in-from-bottom-5">
            <div className="bg-slate-900 text-white px-8 py-4 rounded-[2rem] shadow-2xl flex items-center gap-8 border border-slate-800">
               <div className="flex items-center gap-3 pr-8 border-r border-slate-700">
                 <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center font-black text-xs">{selectedNis.length}</div>
                 <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Terpilih</span>
               </div>
               <div className="flex items-center gap-4">
                 <button onClick={() => setShowBulkRoomModal(true)} className="bg-white text-slate-900 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all">Atur Massal</button>
                 <button onClick={() => setSelectedNis([])} className="text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all">Batal</button>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'ROOMS' && (
          <div className="max-w-7xl mx-auto">
             <div className="flex justify-between items-center mb-10">
                <h2 className="text-3xl font-black text-slate-900">Data Ruang</h2>
                <button onClick={() => setShowAddRoomModal(true)} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-indigo-700 transition-all">+ Tambah Ruang</button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {rooms.map(room => {
                  const studentCount = students.filter(s => String(s.roomId || '').trim() === String(room.id).trim()).length;
                  return (
                    <div key={room.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative group hover:shadow-lg transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner">
                          {room.name.charAt(0)}
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setRoomToEdit(room)} 
                            className="p-2.5 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-xl transition-all"
                            title="Edit Ruang"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button 
                            onClick={() => setRoomToDelete(room.id)} 
                            className="p-2.5 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded-xl transition-all"
                            title="Hapus Ruang"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <h3 className="text-xl font-black text-slate-900 mb-1">{room.name}</h3>
                      <div className="flex flex-col gap-1 mt-2 mb-6">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Akses Proktor:</p>
                        <p className="text-xs font-mono bg-slate-50 px-2 py-1 rounded border border-slate-100 truncate">{room.username} / {room.password}</p>
                      </div>
                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
                        <div className="flex flex-col">
                           <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Kapasitas</span>
                           <span className="text-sm font-bold text-slate-700">{room.capacity} Siswa</span>
                        </div>
                        <div className="flex flex-col items-end">
                           <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Terisi</span>
                           <span className={`text-sm font-bold ${studentCount >= room.capacity ? 'text-red-500' : 'text-indigo-600'}`}>{studentCount} Siswa</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
             </div>
          </div>
        )}
      </main>

      {/* FLOATING PDF PREVIEW */}
      {hoveredPdf && (
        <div 
          className="fixed bottom-10 right-10 z-[999] pointer-events-none animate-in slide-in-from-right-10 fade-in duration-300"
        >
          <div className="w-[450px] h-[600px] bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col shadow-indigo-500/10 relative">
            <div className="absolute inset-0 z-[1000] pointer-events-auto bg-transparent" title="Preview Locked"></div>
            <div className="flex items-center justify-between px-8 py-4 border-b border-slate-50 bg-slate-50/50">
               <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Document Preview</span>
               </div>
            </div>
            <iframe 
              src={`${hoveredPdf}#toolbar=0&navpanes=0`} 
              className="w-full flex-1 border-none"
            />
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH SISWA MANUAL */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg p-10 rounded-[2.5rem] shadow-2xl overflow-y-auto max-h-[90vh] border border-slate-100">
            <div className="flex items-center gap-4 mb-8">
               <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
               </div>
               <h3 className="text-2xl font-black text-slate-900 tracking-tight">Tambah Siswa Baru</h3>
            </div>
            
            <form onSubmit={handleSaveNewStudent} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest ml-1">NIS (Wajib)</label>
                  <input name="nis" type="text" required className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-mono font-bold text-indigo-600 outline-none focus:border-indigo-500" placeholder="4511" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest ml-1">Password</label>
                  <input name="password" type="text" defaultValue="password123" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:border-indigo-500" />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest ml-1">Nama Lengkap</label>
                <input name="name" type="text" required className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:border-indigo-500" placeholder="Ahmad Zakaria" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest ml-1">Kelas</label>
                  <select name="class" required className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:border-indigo-500">
                    <option value="7">Kelas 7</option>
                    <option value="8">Kelas 8</option>
                    <option value="9">Kelas 9</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest ml-1">Penugasan Ruang</label>
                  <select name="roomId" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:border-indigo-500">
                    <option value="">Tanpa Ruang</option>
                    {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowAddStudentModal(false)} className="flex-1 bg-slate-50 text-slate-500 font-bold py-4 rounded-2xl">Batal</button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100">Simpan Siswa</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL LAINNYA DIBAWAH TETAP SAMA SEPERTI SEBELUMNYA */}
      {/* ... (Modal-modal lain tetap ada di file ini) ... */}

      {/* MODAL: EDIT DATA SESI UJIAN */}
      {sessionToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg p-10 rounded-[2.5rem] shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-2xl font-black text-slate-900 mb-8 tracking-tight">Ubah Sesi Ujian</h3>
            <form onSubmit={handleSaveEditSession} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest ml-1">Nama Ujian</label>
                <input 
                  type="text" 
                  required 
                  value={sessionToEdit.name}
                  onChange={e => setSessionToEdit({...sessionToEdit, name: e.target.value})}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:border-indigo-500 transition-all" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest ml-1">Kelas</label>
                  <select 
                    value={sessionToEdit.class}
                    onChange={e => setSessionToEdit({...sessionToEdit, class: e.target.value})}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none"
                  >
                    <option value="7">Kelas 7</option>
                    <option value="8">Kelas 8</option>
                    <option value="9">Kelas 9</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest ml-1">PIN Sesi</label>
                  <input 
                    type="text" 
                    required 
                    value={sessionToEdit.pin}
                    onChange={e => setSessionToEdit({...sessionToEdit, pin: e.target.value.toUpperCase()})}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-center font-mono font-bold text-indigo-600 outline-none" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest ml-1">Durasi (Menit)</label>
                <input 
                  type="number" 
                  required 
                  value={sessionToEdit.durationMinutes}
                  onChange={e => setSessionToEdit({...sessionToEdit, durationMinutes: parseInt(e.target.value)})}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest ml-1">Link PDF Soal</label>
                <input 
                  type="url" 
                  required 
                  value={sessionToEdit.pdfUrl || ''}
                  onChange={e => setSessionToEdit({...sessionToEdit, pdfUrl: e.target.value})}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:border-indigo-500 transition-all" 
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setSessionToEdit(null)} className="flex-1 bg-slate-50 text-slate-500 font-bold py-4 rounded-2xl">Batal</button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100">Simpan Perubahan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg p-10 rounded-[2.5rem] shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-2xl font-black text-slate-900 mb-8 tracking-tight">Sesi Ujian Baru</h3>
            <form onSubmit={handleSaveNewSession} className="space-y-6">
              <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest ml-1">Nama Ujian</label><input name="name" type="text" required className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none" placeholder="Contoh: UTS Matematika" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest ml-1">Kelas</label><select name="class" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none"><option value="7">Kelas 7</option><option value="8">Kelas 8</option><option value="9">Kelas 9</option></select></div>
                <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest ml-1">PIN Sesi</label><input name="pin" type="text" required className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-center font-mono font-bold text-indigo-600 outline-none" placeholder="ABCD" /></div>
              </div>
              <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest ml-1">Durasi (Menit)</label><input name="duration" type="number" defaultValue="60" required className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none" /></div>
              <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest ml-1">Link PDF Soal</label><input name="pdfUrl" type="url" required className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none" placeholder="https://drive.google.com/.../preview" /></div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 bg-slate-50 text-slate-500 font-bold py-4 rounded-2xl">Batal</button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100">Simpan Sesi</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBulkRoomModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md p-10 rounded-[2.5rem] shadow-2xl border border-slate-100">
            <h3 className="text-2xl font-black text-slate-900 mb-2">Atur {selectedNis.length} Siswa</h3>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-8">Pilih perubahan yang ingin diterapkan secara massal</p>
            
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Ubah Ruang Ujian</label>
                <select value={targetBulkRoomId} onChange={(e) => setTargetBulkRoomId(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-indigo-500 transition-all">
                  <option value="KEEP">-- Jangan Ubah Ruang --</option>
                  <option value="">(Kosongkan Ruang)</option>
                  {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Ubah Status Siswa</label>
                <select value={targetBulkStatus} onChange={(e) => setTargetBulkStatus(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-indigo-500 transition-all">
                  <option value="KEEP">-- Jangan Ubah Status --</option>
                  <option value={StudentStatus.BELUM_MASUK}>Belum Masuk</option>
                  <option value={StudentStatus.SEDANG_UJIAN}>Sedang Ujian</option>
                  <option value={StudentStatus.SELESAI}>Selesai</option>
                  <option value={StudentStatus.BLOKIR}>Blokir</option>
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button onClick={() => setShowBulkRoomModal(false)} className="flex-1 bg-slate-50 text-slate-500 font-bold py-4 rounded-2xl">Batal</button>
                <button onClick={handleApplyBulkRoom} className="flex-1 bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100">Terapkan</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {roomToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md p-10 rounded-[2.5rem] shadow-2xl border border-slate-100">
            <h3 className="text-2xl font-black text-slate-900 mb-8 tracking-tight">Ubah Data Ruang</h3>
            <form onSubmit={handleSaveEditRoom} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1 tracking-widest">Nama Ruang</label>
                <input 
                  type="text" 
                  required 
                  value={roomToEdit.name} 
                  onChange={e => setRoomToEdit({...roomToEdit, name: e.target.value.toUpperCase().trim()})} 
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:border-indigo-500 transition-all uppercase" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1 tracking-widest">Username Proktor</label>
                  <input type="text" value={roomToEdit.username} onChange={e => setRoomToEdit({...roomToEdit, username: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1 tracking-widest">Password Proktor</label>
                  <input type="text" value={roomToEdit.password} onChange={e => setRoomToEdit({...roomToEdit, password: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1 tracking-widest">Kapasitas</label>
                <input 
                  type="number" 
                  required 
                  value={roomToEdit.capacity} 
                  onChange={e => setRoomToEdit({...roomToEdit, capacity: parseInt(e.target.value)})} 
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:border-indigo-500 transition-all" 
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setRoomToEdit(null)} className="flex-1 bg-slate-50 text-slate-500 font-bold py-4 rounded-2xl">Batal</button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddRoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md p-10 rounded-[2.5rem] shadow-2xl border border-slate-100">
            <h3 className="text-2xl font-black text-slate-900 mb-8">Tambah Ruang</h3>
            <form onSubmit={handleSaveNewRoom} className="space-y-6">
              <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1 tracking-widest">Nama Ruang</label><input name="name" type="text" required className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none" placeholder="RUANG 01" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1 tracking-widest">Username Proktor</label><input name="username" type="text" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none" placeholder="proktor_01" /></div>
                <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1 tracking-widest">Password Proktor</label><input name="password" type="text" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none" placeholder="password123" /></div>
              </div>
              <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1 tracking-widest">Kapasitas</label><input name="capacity" type="number" defaultValue="20" required className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none" /></div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowAddRoomModal(false)} className="flex-1 bg-slate-50 text-slate-500 font-bold py-4 rounded-2xl">Batal</button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100">Tambah</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {(roomToDelete || sessionToDelete || studentToDelete) && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-sm p-10 rounded-[3.5rem] shadow-2xl text-center border border-slate-100">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">Hapus Data?</h3>
            <p className="text-slate-500 text-sm mb-10 leading-relaxed">
              Tindakan ini permanen. {roomToDelete ? 'Siswa di ruangan ini akan kehilangan penugasan ruang mereka.' : 'Data yang dihapus tidak dapat dikembalikan.'}
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => {
                  if (roomToDelete) handleDeleteRoom();
                  if (sessionToDelete) handleDeleteSession();
                  if (studentToDelete) {
                    setStudents(prev => prev.filter(s => String(s.nis) !== String(studentToDelete)));
                    setStudentToDelete(null);
                  }
                }} 
                className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-red-100 transition-all active:scale-95"
              >
                YA, HAPUS PERMANEN
              </button>
              <button 
                onClick={() => {
                  setRoomToDelete(null);
                  setSessionToDelete(null);
                  setStudentToDelete(null);
                }} 
                className="w-full bg-slate-50 hover:bg-slate-100 text-slate-500 font-bold py-4 rounded-2xl transition-all"
              >
                BATAL
              </button>
            </div>
          </div>
        </div>
      )}

      {studentToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg p-10 rounded-[2.5rem] shadow-2xl border border-slate-100">
            <h3 className="text-2xl font-black text-slate-900 mb-8 tracking-tight">Ubah Data Siswa</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (studentToEdit) {
                setStudents(prev => prev.map(s => String(s.nis) === String(studentToEdit.nis) ? {
                  ...studentToEdit,
                  roomId: studentToEdit.roomId ? String(studentToEdit.roomId).trim() : undefined
                } : s));
                setStudentToEdit(null);
              }
            }} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">NIS</label><input type="text" readOnly value={studentToEdit.nis} className="w-full px-5 py-4 bg-slate-100 rounded-2xl text-sm font-mono font-bold text-slate-500 outline-none" /></div>
                <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Password</label><input type="text" value={studentToEdit.password} onChange={e => setStudentToEdit({...studentToEdit, password: e.target.value})} className="w-full px-5 py-4 bg-slate-50 rounded-2xl text-sm font-medium outline-none" /></div>
              </div>
              <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Nama Lengkap</label><input type="text" required value={studentToEdit.name} onChange={e => setStudentToEdit({...studentToEdit, name: e.target.value})} className="w-full px-5 py-4 bg-slate-50 rounded-2xl text-sm font-medium outline-none" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Penugasan Ruang</label>
                  <select value={studentToEdit.roomId || ''} onChange={e => setStudentToEdit({...studentToEdit, roomId: e.target.value})} className="w-full px-5 py-4 bg-slate-50 rounded-2xl text-sm font-medium outline-none">
                    <option value="">Tanpa Ruang</option>
                    {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Status Akun</label>
                  <select value={studentToEdit.status} onChange={e => setStudentToEdit({...studentToEdit, status: e.target.value as StudentStatus})} className="w-full px-5 py-4 bg-slate-50 rounded-2xl text-sm font-medium outline-none">
                    <option value={StudentStatus.BELUM_MASUK}>Belum Masuk</option>
                    <option value={StudentStatus.SEDANG_UJIAN}>Sedang Ujian</option>
                    <option value={StudentStatus.SELESAI}>Selesai</option>
                    <option value={StudentStatus.BLOKIR}>Blokir</option>
                  </select>
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setStudentToEdit(null)} className="flex-1 bg-slate-50 text-slate-500 font-bold py-4 rounded-2xl">Batal</button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
