
import React from 'react';
import { ViewState } from '../types';

interface LandingViewProps {
  onNavigate: (view: ViewState) => void;
}

const LandingView: React.FC<LandingViewProps> = ({ onNavigate }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 md:p-6 text-center bg-slate-50 relative overflow-hidden">
      {/* Dekorasi Latar Belakang Halus */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-gradient-to-b from-indigo-50/50 to-transparent pointer-events-none -z-10"></div>
      
      <div className="mb-8 md:mb-16 mt-4 animate-in fade-in slide-in-from-top-4 duration-700">
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 mb-3 md:mb-4">
          Examsy<span className="text-indigo-600">.</span>
        </h1>
        <p className="text-base md:text-xl text-slate-500 max-w-sm md:max-w-lg mx-auto font-medium leading-relaxed px-4">
          Platform ujian semi-online modern dengan fokus pada kemudahan, kecepatan, dan estetika.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 w-full max-w-3xl px-2">
        <button
          onClick={() => onNavigate('STUDENT_LOGIN')}
          className="group relative flex flex-col items-center p-6 md:p-12 bg-white rounded-[2.5rem] md:rounded-[3rem] shadow-sm border border-slate-100 hover:shadow-2xl hover:border-indigo-100 hover:-translate-y-1 active:scale-95 transition-all duration-300 overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:scale-110 transition-transform">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-32 w-32" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path d="M12 14l9-5-9-5-9 5 9 5z" />
             </svg>
          </div>
          
          <div className="w-14 h-14 md:w-20 md:h-20 bg-indigo-50 text-indigo-600 rounded-2xl md:rounded-3xl flex items-center justify-center mb-5 md:mb-8 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 md:h-10 md:w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            </svg>
          </div>
          <h2 className="text-xl md:text-3xl font-black text-slate-900 mb-2 tracking-tight">Portal Siswa</h2>
          <p className="text-slate-400 text-sm md:text-base font-medium">Mulai ujian dengan NIS dan PIN Sesi Anda.</p>
          
          <div className="mt-6 md:mt-8 flex items-center gap-2 text-indigo-600 font-black text-[10px] md:text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
            Masuk Sekarang
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </div>
        </button>

        <button
          onClick={() => onNavigate('ADMIN_LOGIN')}
          className="group relative flex flex-col items-center p-6 md:p-12 bg-white rounded-[2.5rem] md:rounded-[3rem] shadow-sm border border-slate-100 hover:shadow-2xl hover:border-emerald-100 hover:-translate-y-1 active:scale-95 transition-all duration-300 overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:scale-110 transition-transform">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-32 w-32" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
             </svg>
          </div>

          <div className="w-14 h-14 md:w-20 md:h-20 bg-emerald-50 text-emerald-600 rounded-2xl md:rounded-3xl flex items-center justify-center mb-5 md:mb-8 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 md:h-10 md:w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h2 className="text-xl md:text-3xl font-black text-slate-900 mb-2 tracking-tight">Portal Staff</h2>
          <p className="text-slate-400 text-sm md:text-base font-medium">Kelola soal, siswa, dan sesi ujian.</p>
          
          <div className="mt-6 md:mt-8 flex items-center gap-2 text-emerald-600 font-black text-[10px] md:text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
            Kelola Sistem
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </div>
        </button>
      </div>

      <footer className="mt-12 md:mt-24 text-slate-400 text-[10px] md:text-sm font-black uppercase tracking-[0.2em] animate-in fade-in duration-1000">
        &copy; 2026 Humas SMP Al Irsyad Surakarta
      </footer>
    </div>
  );
};

export default LandingView;
