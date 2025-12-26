
import React, { useMemo, useState } from 'react';
import { Student, StudentStatus, Room } from '../types';
import { updateStudentInCloud } from '../services/databaseService';

interface ProctorDashboardProps {
  room: Room;
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  isSyncing: boolean;
  onLogout: () => void;
}

const ProctorDashboard: React.FC<ProctorDashboardProps> = ({ 
  room, students, setStudents, isSyncing: globalSyncing, onLogout 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [pendingStatus, setPendingStatus] = useState<StudentStatus | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

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

  const openStatusPopup = (student: Student) => {
    setSelectedStudent(student);
    setPendingStatus(student.status);
  };

  const handleSaveStatus = async () => {
    if (selectedStudent && pendingStatus) {
      setIsUpdating(true);
      
      // 1. Update Cloud Secara Spesifik (Hanya NIS ini)
      const GAS_URL = "https://script.google.com/macros/s/AKfycby8Z8BdPpZ_dMhYFOFXdeBmdTVvBjBsY43FCXXw3vKmtFYCBdS7XH7t7F1pz5R9I97GbQ/exec";
      const success = await updateStudentInCloud(GAS_URL, selectedStudent.nis, pendingStatus);
      
      // 2. Update Local State
      if (success) {
        setStudents(prev => prev.map(s => 
          s.nis === selectedStudent.nis ? { ...s, status: pendingStatus } : s
        ));
      }
      
      setIsUpdating(false);
      setSelectedStudent(null);
      setPendingStatus(null);
    }
  };

  const getStatusBadge = (status: StudentStatus, isSmall = false) => {
    const baseClasses = `font-black uppercase tracking-wider rounded-full transition-all duration-300 ${isSmall ? 'text-[8px] px-2 py-0.5' : 'text-[10px] px-3 py-1'}`;
    switch (status) {
      case StudentStatus.BELUM_MASUK: return <span className={`${baseClasses} bg-slate-100 text-slate-500`}>Belum Masuk</span>;
      case StudentStatus.SEDANG_UJIAN: return <span className={`${baseClasses} bg-amber-100 text-amber-600 animate-pulse`}>Sedang Ujian</span>;
      case StudentStatus.SELESAI: return <span className={`${baseClasses} bg-emerald-100 text-emerald-600`}>Selesai</span>;
      case StudentStatus.BLOKIR: return <span className={`${baseClasses} bg-red-100 text-red-600`}>Blokir</span>;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50 font-sans">
      <header className="bg-indigo-900 border-b border-indigo-800 px-4 md:px-10 py-4 md:py-6 flex items-center justify-between shrink-0 shadow-lg z-40">
        <div className="flex items-center gap-3 md:gap-4">
           <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-500 rounded-xl md:rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg">P</div>
           <div>
              <h1 className="text-white text-base md:text-xl font-black tracking-tight uppercase truncate max-w-[120px] md:max-w-none">{room.name}</h1>
              <p className="text-indigo-300 text-[8px] md:text-[10px] font-black uppercase tracking-widest leading-none">Pengawas Ruang</p>
           </div>
        </div>
        
        <div className="flex items-center gap-3 md:gap-6">
          <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/5">
             <div className={`w-1.5 h-1.5 rounded-full ${isUpdating || globalSyncing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}></div>
             <span className="text-[8px] md:text-[10px] font-black text-white/60 uppercase tracking-widest hidden sm:inline">
               {isUpdating ? 'Updating Cloud...' : 'Terhubung'}
             </span>
          </div>

          <button onClick={onLogout} className="flex items-center gap-2 text-indigo-200 hover:text-white font-bold text-xs md:text-sm transition-all">
            <span className="hidden sm:inline">Keluar</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-4 md:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4 md:p-10">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="px-2">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Daftar Peserta</h2>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                {searchTerm ? `Hasil: ${filteredStudents.length} Peserta` : `Total ${filteredStudents.length} Peserta di ${room.name}`}
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
            </div>
          </div>

          <div className="bg-white rounded-[2rem] md:rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black tracking-widest border-b border-slate-100 hidden md:table-header-group">
                <tr>
                  <th className="px-10 py-6">NIS</th>
                  <th className="px-10 py-6">Nama Peserta</th>
                  <th className="px-10 py-6 text-center">Status</th>
                  <th className="px-10 py-6 text-right pr-14">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map(student => (
                  <tr key={String(student.nis)} className="hover:bg-slate-50/50 transition-colors flex flex-col md:table-row p-4 md:p-0">
                    <td className="md:px-10 md:py-6 font-mono text-xs font-bold text-indigo-600 mb-1 md:mb-0">
                      <span className="md:hidden text-slate-400 font-sans mr-2 uppercase tracking-widest">NIS:</span>
                      {student.nis}
                    </td>
                    <td className="md:px-10 md:py-6 font-bold text-slate-800 text-sm mb-2 md:mb-0">
                      {student.name}
                    </td>
                    <td className="md:px-10 md:py-6 text-center mb-4 md:mb-0 flex items-center md:justify-center">
                      <span className="md:hidden text-slate-400 font-sans mr-2 uppercase tracking-widest text-[8px] font-black">Status:</span>
                      {getStatusBadge(student.status)}
                    </td>
                    <td className="md:px-10 md:py-6 text-right md:pr-10">
                       <button 
                         onClick={() => openStatusPopup(student)}
                         className="w-full md:w-auto bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest px-6 py-3 rounded-xl hover:bg-indigo-600 transition-all shadow-lg active:scale-95"
                       >
                         Atur Status
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* STATUS MODAL POPUP */}
      {selectedStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-sm p-8 md:p-10 rounded-[3rem] shadow-2xl border border-white/20">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-indigo-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">{selectedStudent.name}</h3>
              <p className="text-indigo-600 font-mono text-[10px] font-black uppercase tracking-widest mt-1">NIS: {selectedStudent.nis}</p>
            </div>

            <div className="space-y-3 mb-10">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Pilih Status Baru:</label>
              {[StudentStatus.BELUM_MASUK, StudentStatus.SEDANG_UJIAN, StudentStatus.SELESAI, StudentStatus.BLOKIR].map((status) => (
                <button
                  key={status}
                  disabled={isUpdating}
                  onClick={() => setPendingStatus(status)}
                  className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border-2 transition-all ${
                    pendingStatus === status 
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl translate-x-1' 
                    : 'bg-slate-50 border-slate-50 text-slate-500 hover:border-slate-200'
                  }`}
                >
                  <span className="text-[11px] font-black uppercase tracking-widest">{status.replace('_', ' ')}</span>
                  {pendingStatus === status && <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={handleSaveStatus}
                disabled={isUpdating}
                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:bg-indigo-600 transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                {isUpdating && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                {isUpdating ? 'MENYIMPAN...' : 'SIMPAN PERUBAHAN'}
              </button>
              <button 
                onClick={() => setSelectedStudent(null)}
                disabled={isUpdating}
                className="w-full py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-600"
              >
                BATALKAN
              </button>
            </div>
          </div>
        </div>
      )}
      
      {(isUpdating || globalSyncing) && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="bg-slate-900 text-white px-6 py-4 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-white/10 animate-in slide-in-from-bottom-5">
            <div className="flex gap-1">
               <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce"></div>
               <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
               <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Pembaruan Aman...</span>
          </div>
        </div>
      )}

      <style>{`
        ::-webkit-scrollbar { width: 0; display: none; }
        * { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default ProctorDashboard;
