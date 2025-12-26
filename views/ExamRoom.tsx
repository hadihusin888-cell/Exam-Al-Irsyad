
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Student, ExamSession } from '../types';

interface ExamRoomProps {
  student: Student;
  session: ExamSession;
  onFinish: (submission: any) => void;
}

const ExamRoom: React.FC<ExamRoomProps> = ({ student, session, onFinish }) => {
  const [timeLeft, setTimeLeft] = useState(session.durationMinutes * 60);
  const [hasConsented, setHasConsented] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [violations, setViolations] = useState(0);
  const [isFocusLost, setIsFocusLost] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0); 
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const wakeLockRef = useRef<any>(null);
  const lastViolationTime = useRef(0);

  const MAX_VIOLATIONS = 3;

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      }
    } catch (err) {}
  };

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  }, []);

  const triggerViolation = useCallback((reason: string) => {
    const now = Date.now();
    if (now - lastViolationTime.current < 2500) return; // Throttling violations
    lastViolationTime.current = now;
    setIsFocusLost(true);
    setViolations(v => v + 1);
  }, []);

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);

    const timer = setInterval(() => {
      if (hasConsented && timeLeft > 0) setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      clearInterval(timer);
      releaseWakeLock();
    };
  }, [hasConsented, timeLeft, releaseWakeLock]);

  useEffect(() => {
    if (!hasConsented) return;
    const handleVisibilityChange = () => { if (document.hidden) triggerViolation("App Switched"); };
    const handleBlur = () => triggerViolation("Window Blur");
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [hasConsented, triggerViolation]);

  const startPersistence = async () => {
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } }).catch(() => null);
        if (stream && videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }
      const elem = document.documentElement;
      if (elem.requestFullscreen) await elem.requestFullscreen();
      await requestWakeLock();
      setHasConsented(true);
    } catch (err) {
      setHasConsented(true);
    }
  };

  if (violations >= MAX_VIOLATIONS) {
    onFinish(null);
    return null;
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden select-none bg-slate-950 font-sans relative">
      <video ref={videoRef} className="hidden" aria-hidden="true" muted playsInline />

      {/* OVERLAY LOADING / CONSENT */}
      {!hasConsented && (
        <div className="fixed inset-0 z-[1000] bg-slate-950 flex items-center justify-center p-6 backdrop-blur-md">
          <div className="bg-white w-full max-w-sm p-10 rounded-[3rem] text-center shadow-2xl animate-gpu">
            <h2 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">Kunci Ujian</h2>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-10 leading-relaxed">Sistem akan mengunci layar ke mode Fullscreen.</p>
            <button onClick={startPersistence} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">Masuk Ruang Ujian</button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="h-14 md:h-20 shrink-0 z-50 border-b border-white/5 bg-black/40 backdrop-blur-xl flex items-center px-4 md:px-10">
        <div className="flex-1 overflow-hidden">
          <h2 className="text-white font-black uppercase truncate text-[10px] md:text-sm">{student.name}</h2>
          <span className="text-indigo-400 font-bold uppercase tracking-widest text-[8px] md:text-[10px]">{student.class} | {student.nis}</span>
        </div>
        <div className="flex-1 text-center hidden sm:block">
          <h1 className="text-white font-black uppercase tracking-tighter truncate text-xs md:text-lg">{session.name}</h1>
        </div>
        <div className="flex-1 flex items-center justify-end gap-3 md:gap-6">
          <div className={`font-mono font-black text-xs md:text-lg ${timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-indigo-400'}`}>
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </div>
          <button onClick={() => setShowConfirm(true)} className="bg-emerald-500 text-white px-4 md:px-8 py-2 md:py-3 rounded-xl font-black uppercase text-[9px] md:text-xs tracking-widest active:scale-90 transition-all">Selesai</button>
        </div>
      </header>

      {/* VIEWPORT */}
      <main className={`flex-1 bg-slate-900 relative transition-all duration-300 ${isFocusLost ? 'blur-3xl pointer-events-none' : ''}`}>
        {hasConsented && session.pdfUrl && (
          <iframe key={iframeKey} src={`${session.pdfUrl}#toolbar=0&navpanes=0&view=FitH`} className="w-full h-full border-none" title="Soal PDF" loading="lazy" />
        )}
        {/* Watermark anti-cam */}
        <div className="absolute inset-0 z-50 pointer-events-none opacity-[0.03] overflow-hidden select-none">
           <div className="flex flex-wrap rotate-12 scale-150">
             {[...Array(20)].map((_, i) => (
               <div key={i} className="text-white text-xl font-black p-20 uppercase whitespace-nowrap">{student.nis} {student.name}</div>
             ))}
           </div>
        </div>
      </main>

      {/* MODALS (Same look, optimized CSS) */}
      {showConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm p-10 rounded-[2.5rem] shadow-2xl text-center animate-gpu">
            <h3 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-tight">Kirim Jawaban?</h3>
            <div className="flex flex-col gap-3">
              <button onClick={() => onFinish(null)} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">YA, KIRIM SEKARANG</button>
              <button onClick={() => setShowConfirm(false)} className="w-full text-slate-400 font-bold py-2 text-[10px] uppercase">Batal</button>
            </div>
          </div>
        </div>
      )}

      {isFocusLost && hasConsented && (
        <div className="fixed inset-0 z-[5000] bg-slate-950/90 flex items-center justify-center p-8 backdrop-blur-md">
          <div className="bg-white w-full max-w-sm p-10 rounded-3xl text-center shadow-2xl animate-gpu">
            <p className="text-red-500 font-black uppercase text-[10px] mb-2 tracking-widest">Keamanan Aktif</p>
            <h3 className="text-lg font-black text-slate-900 mb-6">Pelanggaran Terdeteksi ({violations}/{MAX_VIOLATIONS})</h3>
            <button onClick={() => { setIsFocusLost(false); if(!isFullscreen) document.documentElement.requestFullscreen().catch(()=>{}); }} className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase">Lanjutkan Ujian</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamRoom;
