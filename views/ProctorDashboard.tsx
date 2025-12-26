
import React, { useMemo, useState } from 'react';
import { Student, StudentStatus, Room } from '../types';

interface ProctorDashboardProps {
  room: Room;
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  isSyncing: boolean;
  onLogout: () => void;
}

const ProctorDashboard: React.FC<ProctorDashboardProps> = ({ 
  room, students, setStudents, isSyncing, onLogout 
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Sinkronisasi data dengan filter Ruang dan Pencarian
  const filteredStudents = useMemo(() => {
    const roomStudents = students.filter(s => {
      if (!s.roomId || !room.id) return false;
      return String(s.roomId).trim() === String(room.id).trim();
    });

    if (!searchTerm.trim()) return roomStudents;

    const term = searchTerm.toLowerCase();
    return roomStudents.filter(s => 
      s.name.toLowerCase().includes(term) || 
      String(s.nis).toLowerCase().includes(term)
    );
  }, [students, room.id, searchTerm]);

  const updateStatus = (nis: string, newStatus: StudentStatus) => {
    setStudents(prev => prev.map(s => s.nis === nis ? { ...s, status: newStatus } : s));
  };

  const getStatusBadge = (status: StudentStatus) => {
    switch (status) {
      case StudentStatus.BELUM_MASUK:
        return <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">Belum Masuk</span>;
      case StudentStatus.SEDANG_UJIAN:
        return <span className="bg-amber-100 text-amber-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider animate-pulse">Sedang Ujian</span>;
      case StudentStatus.SELESAI:
        return <span className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">Selesai</span>;
      case StudentStatus.BLOKIR:
        return <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">Blokir</span>;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50 font-sans">
      {/* Header Responsif */}
      <header className="bg-indigo-900 border-b border-indigo-800 px-4 md:px-10 py-4 md:py-6 flex items-center justify-between shrink-0 shadow-lg z-10">
        <div className="flex items-center gap-3 md:gap-4">
           <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-500 rounded-xl md:rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg">P</div>
           <div>
              <h1 className="text-white text-base md:text-xl font-black tracking-tight uppercase truncate max-w-[120px] md:max-w-none">{room.name}</h1>
              <p className="text-indigo-300 text-[8px] md:text-[10px] font-black uppercase tracking-widest leading-none">Pengawas Ruang</p>
           </div>
        </div>
        
        <div className="flex items-center gap-3 md:gap-6">
          <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/5">
             <div className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}></div>
             <span className="text-[8px] md:text-[10px] font-black text-white/60 uppercase tracking-widest hidden sm:inline">
               {isSyncing ? 'Syncing...' : 'Connected'}
             </span>
          </div>

          <button 
            onClick={onLogout} 
            className="flex items-center gap-2 text-indigo-200 hover:text-white font-bold text-xs md:text-sm transition-all"
          >
            <span className="hidden sm:inline">Keluar</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-4 md:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4 md:p-10">
        <div className="max-w-6xl mx-auto">
          {/* SEARCH BAR & TITLE */}
          <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="px-2">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Daftar Siswa</h2>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                {searchTerm ? `Hasil: ${filteredStudents.length} Peserta` : `Total ${filteredStudents.length} Peserta`}
              </p>
            </div>
            
            <div className="relative group w-full md:w-80">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input 
                type="text" 
                placeholder="Cari Nama atau NIS..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-10 py-4 bg-white border border-slate-200 rounded-[1.5rem] md:rounded-2xl text-sm font-bold shadow-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-300 placeholder:font-medium"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-red-500 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* VIEW DESKTOP: TABLE */}
          <div className="hidden md:block bg-white rounded-[3rem] border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-10 py-6">NIS</th>
                  <th className="px-10 py-6">Nama Peserta</th>
                  <th className="px-10 py-6 text-center">Status</th>
                  <th className="px-10 py-6 text-right pr-14">Kontrol Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map(student => (
                  <tr key={String(student.nis)} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-10 py-6 font-mono text-xs font-bold text-indigo-600">{student.nis}</td>
                    <td className="px-10 py-6 font-bold text-slate-800 text-sm">{student.name}</td>
                    <td className="px-10 py-6 text-center">{getStatusBadge(student.status)}</td>
                    <td className="px-10 py-6 text-right pr-10">
                       <select 
                        value={student.status}
                        onChange={(e) => updateStatus(student.nis, e.target.value as StudentStatus)}
                        className="bg-slate-50 border border-slate-200 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl outline-none focus:border-indigo-500 transition-all cursor-pointer"
                      >
                        <option value={StudentStatus.BELUM_MASUK}>Belum Masuk</option>
                        <option value={StudentStatus.SEDANG_UJIAN}>Sedang Ujian</option>
                        <option value={StudentStatus.SELESAI}>Selesai</option>
                        <option value={StudentStatus.BLOKIR}>Blokir</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* VIEW MOBILE: CARDS */}
          <div className="md:hidden space-y-4">
            {filteredStudents.map(student => (
              <div key={String(student.nis)} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm active:scale-[0.98] transition-transform">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-sm border border-indigo-100 shadow-inner">
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm leading-tight">{student.name}</h4>
                      <p className="text-indigo-600 font-mono text-[10px] font-bold mt-0.5">{student.nis}</p>
                    </div>
                  </div>
                  {getStatusBadge(student.status)}
                </div>
                <div className="pt-4 border-t border-slate-50">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Atur Status Peserta</label>
                  <select 
                    value={student.status}
                    onChange={(e) => updateStatus(student.nis, e.target.value as StudentStatus)}
                    className="w-full bg-slate-50 border border-slate-100 text-xs font-bold uppercase tracking-widest px-4 py-3 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                  >
                    <option value={StudentStatus.BELUM_MASUK}>Belum Masuk</option>
                    <option value={StudentStatus.SEDANG_UJIAN}>Sedang Ujian</option>
                    <option value={StudentStatus.SELESAI}>Selesai</option>
                    <option value={StudentStatus.BLOKIR}>Blokir</option>
                  </select>
                </div>
              </div>
            ))}
          </div>

          {/* Placeholder jika kosong */}
          {filteredStudents.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 px-10 text-center animate-in fade-in zoom-in-95 duration-500">
               <div className="w-20 h-20 bg-slate-100 rounded-[2.5rem] flex items-center justify-center text-slate-300 mb-6">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                 </svg>
               </div>
               <h3 className="text-slate-900 font-black text-lg mb-2">Tidak Ada Hasil</h3>
               <p className="text-slate-400 font-medium text-sm max-w-xs leading-relaxed">
                 {searchTerm 
                   ? `Pencarian "${searchTerm}" tidak ditemukan di ruangan ini.` 
                   : "Belum ada siswa yang terdaftar di ruangan ini."}
               </p>
               {searchTerm && (
                 <button 
                  onClick={() => setSearchTerm('')}
                  className="mt-6 text-indigo-600 font-black text-xs uppercase tracking-widest hover:underline"
                 >
                   Reset Pencarian
                 </button>
               )}
            </div>
          )}
        </div>
      </main>
      
      {/* Sync Status Floating - Mobile Only */}
      {isSyncing && (
        <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-slate-900/90 backdrop-blur-md text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-3 border border-white/10 animate-in slide-in-from-bottom-5">
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-black uppercase tracking-widest">Sinkronisasi...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProctorDashboard;
