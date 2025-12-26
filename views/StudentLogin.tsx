
import React, { useState } from 'react';
import { ExamSession, Student, StudentStatus } from '../types';

interface StudentLoginProps {
  sessions: ExamSession[];
  students: Student[];
  onLogin: (student: Student, session: ExamSession) => void;
  onAdminClick: () => void;
}

const StudentLogin: React.FC<StudentLoginProps> = ({ sessions, students, onLogin, onAdminClick }) => {
  // GANTI LINK DIBAWAH INI UNTUK MENGUBAH LOGO
  const LOGO_URL = "https://www.alirsyad.or.id/wp-content/uploads/download/alirsyad-alislamiyyah-bw.png"; 
  
  const [formData, setFormData] = useState({
    nis: '',
    password: '',
    studentClass: '',
    pin: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Mencari siswa dengan NIS dan Password yang cocok (Sinkronisasi dengan database lokal/cloud)
    const student = students.find(s => 
      String(s.nis).trim() === String(formData.nis).trim() && 
      s.password === formData.password
    );
    
    if (!student) {
      setError('NIS atau Password salah.');
      return;
    }

    if (student.status === StudentStatus.BLOKIR) {
      setError('Akun Anda telah DIBLOKIR. Silakan hubungi admin.');
      return;
    }

    if (student.status === StudentStatus.SELESAI) {
      setError('Anda sudah menyelesaikan ujian ini.');
      return;
    }

    if (String(student.class) !== String(formData.studentClass)) {
      setError(`Data Anda terdaftar di Kelas ${student.class}. Silakan pilih kelas yang benar.`);
      return;
    }

    // Fix: Ensure pin is treated as a string before calling toLowerCase
    const session = sessions.find(s => String(s.pin || '').toLowerCase() === formData.pin.toLowerCase() && s.isActive);
    
    if (!session) {
      setError('PIN Sesi tidak aktif atau tidak ditemukan.');
      return;
    }

    if (String(session.class) !== String(formData.studentClass)) {
      setError(`Sesi ini diperuntukkan bagi Kelas ${session.class}. Anda memilih Kelas ${formData.studentClass}.`);
      return;
    }

    onLogin(student, session);
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50">
      <button 
        onClick={onAdminClick}
        className="absolute top-6 right-6 p-3 text-slate-400 hover:text-indigo-600 hover:bg-white hover:shadow-md rounded-full transition-all duration-300 group"
        title="Login Admin"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:rotate-90 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      <div className="w-full max-w-md bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100">
        <div className="text-center mb-10 flex flex-col items-center">
          <div className="mb-6 w-24 h-24 bg-white rounded-3xl flex items-center justify-center border-2 border-slate-100 shadow-sm overflow-hidden p-2">
            <img 
              src={LOGO_URL} 
              alt="Logo Sekolah" 
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://via.placeholder.com/150?text=LOGO";
              }}
            />
          </div>
          
          <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">
            SMP AL IRSYAD<span className="text-indigo-600">.</span>
          </h1>
          <p className="text-slate-500 font-medium italic">Sistem Ujian Semi-Online Terintegrasi</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Nomor Induk Siswa</label>
            <input
              type="text"
              required
              value={formData.nis}
              onChange={e => setFormData({...formData, nis: e.target.value})}
              className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
              placeholder="Contoh: 4511"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Password</label>
            <div className="relative group">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium pr-14"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Kelas</label>
              <select
                required
                value={formData.studentClass}
                onChange={e => setFormData({...formData, studentClass: e.target.value})}
                className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium appearance-none"
              >
                <option value="">Pilih Kelas</option>
                <option value="7">Kelas 7</option>
                <option value="8">Kelas 8</option>
                <option value="9">Kelas 9</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">PIN Sesi</label>
              <input
                type="text"
                required
                value={formData.pin}
                onChange={e => setFormData({...formData, pin: e.target.value})}
                className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-center tracking-widest font-mono font-bold"
                placeholder="PIN"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-3 text-red-500 text-sm bg-red-50 p-4 rounded-2xl border border-red-100 animate-head-shake">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-5 rounded-2xl shadow-xl shadow-indigo-200 transition-all active:scale-[0.98] mt-4"
          >
            Mulai Ujian Sekarang
          </button>
        </form>
      </div>

      <footer className="mt-12 text-slate-400 text-sm font-medium">
        &copy; 2026 HUMAS SMP Al Irsyad Surakarta
      </footer>

      <style>{`
        @keyframes head-shake {
          0% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          50% { transform: translateX(4px); }
          75% { transform: translateX(-4px); }
          100% { transform: translateX(0); }
        }
        .animate-head-shake {
          animation: head-shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default StudentLogin;
