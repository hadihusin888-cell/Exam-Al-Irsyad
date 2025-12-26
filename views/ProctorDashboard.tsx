
import React, { useMemo, useState } from 'react';
import { Student, StudentStatus, Room } from '../types';

interface ProctorDashboardProps {
  gasUrl: string;
  room: Room;
  students: Student[];
  isSyncing: boolean;
  onLogout: () => void;
  onAction: (action: string, payload: any) => Promise<boolean>;
}

const ProctorDashboard: React.FC<ProctorDashboardProps> = ({ 
  room, students, isSyncing: globalSyncing, onLogout, onAction 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [pendingStatus, setPendingStatus] = useState<StudentStatus | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const isInRoom = String(s.roomId || '').trim() === String(room.id).trim();
      if (!isInRoom) return false;
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const nameMatch = (s.name || '').toLowerCase().includes(term);
      const nisMatch = String(s.nis || '').toLowerCase().includes(term);
      const classMatch = String(s.class || '').toLowerCase().includes(term);
      return nameMatch || nisMatch || classMatch;
    });
  }, [students, room.id, searchTerm]);

  const handleSaveStatus = async () => {
    if (selectedStudent && pendingStatus) {
      setIsUpdating(true);
      await onAction('UPDATE_STUDENT', { ...selectedStudent, status: pendingStatus });
      setIsUpdating(false);
      setSelectedStudent(null);
    }
  };

  const getStatusBadge = (status: StudentStatus) => {
    const base = "font-black uppercase tracking-wider rounded-full text-[10px] px-3 py-1";
    switch (status) {
      case StudentStatus.BELUM_MASUK: return <span className={`${base} bg-slate-100 text-slate-500`}>Belum Masuk</span>;
      case StudentStatus.SEDANG_UJIAN: return <span className={`${base} bg-amber-100 text-amber-600 animate-pulse`}>Sedang Ujian</span>;
      case StudentStatus.SELESAI: return <span className={`${base} bg-emerald-100 text-emerald-600`}>Selesai</span>;
      case StudentStatus.BLOKIR: return <span className={`${base} bg-red-100 text-red-600`}>Blokir</span>;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
      <header className="bg-indigo-900 px-6 py-4 flex items-center justify-between shadow-lg z-50">
        <div className="flex items-center gap-4">
           <div className="w-10 h-10 bg-indigo-500 rounded-2xl flex items-center justify-center text-white font-black">P</div>
           <div>
              <h1 className="text-white font-black uppercase tracking-tight">{(room && room.name) || 'RUANG'}</h1>
              <p className="text-indigo-300 text-[10px] font-bold uppercase tracking-widest">Pengawas Ruang</p>
           </div>
        </div>
        <div className="flex items-center gap-4">
          {globalSyncing && <div className="w-4 h-4 border-2 border-indigo-400 border-t-white rounded-full animate-spin"></div>}
          <button onClick={onLogout} className="text-indigo-200 hover:text-white font-bold text-sm">Keluar</button>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6 md:p-10">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <h2 className="text-2xl font-black text-slate-900 uppercase">Peserta Ujian ({filteredStudents.length})</h2>
            <input 
              type="text" 
              placeholder="Cari Nama/NIS/Kelas..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full md:w-80 px-6 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm outline-none focus:border-indigo-500"
            />
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[800px]">
                <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black tracking-widest border-b">
                  <tr>
                    <th className="px-10 py-6">NIS</th>
                    <th className="px-10 py-6">Nama Peserta</th>
                    <th className="px-10 py-6">Kelas</th>
                    <th className="px-10 py-6 text-center">Status</th>
                    <th className="px-10 py-6 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-10 py-20 text-center text-slate-300 font-black uppercase tracking-widest">Tidak ada siswa di ruang ini</td>
                    </tr>
                  ) : (
                    filteredStudents.map(student => (
                      <tr key={String(student.nis)} className="hover:bg-slate-50 transition-colors">
                        <td className="px-10 py-6 font-mono font-bold text-indigo-600">{student.nis}</td>
                        <td className="px-10 py-6 font-bold text-slate-800 uppercase">{student.name}</td>
                        <td className="px-10 py-6">
                           <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">Kls {student.class}</span>
                        </td>
                        <td className="px-10 py-6 text-center">{getStatusBadge(student.status)}</td>
                        <td className="px-10 py-6 text-right">
                           <button 
                             onClick={() => { setSelectedStudent(student); setPendingStatus(student.status); }}
                             className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest px-6 py-2.5 rounded-xl hover:bg-indigo-600 transition-all"
                           >
                             Atur
                           </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {selectedStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm p-10 rounded-[3rem] shadow-2xl">
            <div className="text-center mb-8">
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block mb-1">Pengaturan Status</span>
              <h3 className="text-xl font-black text-slate-900 uppercase">{selectedStudent.name}</h3>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Kelas {selectedStudent.class} • {selectedStudent.nis}</span>
            </div>
            <div className="space-y-3 mb-8">
              {[StudentStatus.BELUM_MASUK, StudentStatus.SEDANG_UJIAN, StudentStatus.SELESAI, StudentStatus.BLOKIR].map(status => (
                <button
                  key={status}
                  onClick={() => setPendingStatus(status)}
                  className={`w-full py-4 rounded-2xl border-2 font-black text-[11px] uppercase tracking-widest transition-all ${
                    pendingStatus === status ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-50 border-slate-50 text-slate-400'
                  }`}
                >
                  {status.replace('_', ' ')}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={handleSaveStatus} disabled={isUpdating} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase shadow-xl flex items-center justify-center gap-2">
                {isUpdating && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                Simpan Perubahan
              </button>
              <button onClick={() => setSelectedStudent(null)} className="w-full py-3 text-slate-400 font-bold text-[10px] uppercase">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProctorDashboard;
