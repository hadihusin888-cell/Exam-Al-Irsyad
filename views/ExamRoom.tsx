
import React, { useState, useEffect, useRef } from 'react';
import { Student, ExamSession, StudentStatus } from '../types';

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
  const [deviceType, setDeviceType] = useState<'iOS' | 'Android' | 'Desktop'>('Desktop');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [iframeKey, setIframeKey] = useState(0); 
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const mainRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const wakeLockRef = useRef<any>(null);
  
  const MAX_VIOLATIONS = 3;
  const lastViolationTime = useRef(0);

  useEffect(() => {
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) {
      setDeviceType('iOS');
    } else if (/Android/.test(ua)) {
      setDeviceType('Android');
    } else {
      setDeviceType('Desktop');
    }

    const handleFsChange = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      if (hasConsented && !fs && deviceType !== 'iOS') {
        triggerViolation("Exit Fullscreen");
      }
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasConsented) {
        e.preventDefault();
        e.returnValue = "Ujian sedang berlangsung!";
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    const timer = setInterval(() => {
      if (hasConsented && timeLeft > 0) {
        setTimeLeft(prev => prev - 1);
      }
    }, 1000);

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearInterval(timer);
      releaseWakeLock();
    };
  }, [hasConsented, timeLeft, deviceType]);

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      }
    } catch (err) {
      console.warn("Wake Lock failed:", err);
    }
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  };

  const enterFullscreen = async () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if ((elem as any).webkitRequestFullscreen) {
        await (elem as any).webkitRequestFullscreen();
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
    }
  };

  const startPersistence = async () => {
    setCameraError(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
        } catch (camErr: any) {
          if (camErr.name === 'NotAllowedError') {
            setCameraError('PERMISSION_DENIED');
            return;
          }
        }
      }
      if (deviceType !== 'iOS') await enterFullscreen();
      await requestWakeLock();
      setHasConsented(true);
    } catch (err) {
      setHasConsented(true);
    }
  };

  const triggerViolation = (reason: string) => {
    const now = Date.now();
    if (now - lastViolationTime.current < 2000) return;
    lastViolationTime.current = now;
    setIsFocusLost(true);
    setViolations(v => v + 1);
  };

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
  }, [hasConsented]);

  const handleRefreshPdf = () => setIframeKey(prev => prev + 1);
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.1, 0.5));
  
  const handleFinalFinish = () => {
    window.onbeforeunload = null;
    releaseWakeLock();
    if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
    onFinish(null);
  };

  if (violations >= MAX_VIOLATIONS) {
    handleFinalFinish();
    return null;
  }

  const isIOS = deviceType === 'iOS';

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden select-none font-sans relative ${isIOS ? 'bg-black' : 'bg-slate-950'}`}>
      <video ref={videoRef} className="hidden" aria-hidden="true" muted playsInline />

      {/* FULLSCREEN ENFORCER OVERLAY */}
      {hasConsented && !isFullscreen && !isIOS && (
        <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col items-center justify-center p-8 text-center backdrop-blur-3xl">
           <div className="bg-white p-10 rounded-[3rem] shadow-2xl max-w-sm w-full">
              <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </div>
              <h2 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tighter">MODE AMAN KELUAR</h2>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-8 leading-relaxed">Sistem mendeteksi Anda keluar dari mode Fullscreen. Soal disembunyikan untuk keamanan.</p>
              <button onClick={enterFullscreen} className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 active:scale-95 transition-all">KEMBALI KE FULLSCREEN</button>
           </div>
        </div>
      )}

      {/* OVERLAYS */}
      {!hasConsented && (
        <div className="fixed inset-0 z-[1000] bg-slate-950 flex items-center justify-center p-6 backdrop-blur-md">
          <div className="bg-white w-full max-w-sm p-10 rounded-[3.5rem] text-center shadow-2xl border border-slate-100">
            <h2 className="text-2xl font-black text-slate-900 mb-4 tracking-tighter uppercase">MODUL UJIAN</h2>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-10 leading-relaxed px-4">Browser akan dikunci ke mode Fullscreen otomatis.</p>
            <button onClick={startPersistence} className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100">MULAI & KUNCI</button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="exam-header shrink-0 z-50 border-b border-white/5 bg-black/40 backdrop-blur-3xl relative flex items-center px-2 md:px-10">
        <div className="flex-1 flex flex-col text-left leading-none overflow-hidden">
          <div className="flex items-center gap-1 leading-none">
            <h2 className="student-name text-white font-black uppercase truncate max-w-[100px] sm:max-w-[200px]">{student.name}</h2>
            <div className="bg-red-500 h-1 w-1 rounded-full animate-pulse shadow-[0_0_8px_red]"></div>
          </div>
          <span className="student-info text-indigo-400 font-black uppercase tracking-widest whitespace-nowrap mt-0.5">{student.class} <span className="opacity-30">|</span> {student.nis}</span>
        </div>
        <div className="flex-[1.2] flex items-center justify-center overflow-hidden">
          <h1 className="exam-title text-white font-black uppercase tracking-tighter truncate text-center">{session.name}</h1>
        </div>
        <div className="flex-1 flex items-center justify-end gap-1.5 md:gap-4">
          <button onClick={handleRefreshPdf} className="refresh-btn bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 text-white/40 active:scale-90 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full p-[20%]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
          <div className="timer-box bg-indigo-600/10 rounded-lg border border-indigo-500/20 flex items-center justify-center">
            <span className={`font-mono font-black ${timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-indigo-400'}`}>
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </span>
          </div>
          <button onClick={() => setShowConfirm(true)} className="finish-btn bg-emerald-500 text-white rounded-lg font-black uppercase tracking-widest active:scale-90 transition-all shadow-lg shadow-emerald-500/10">Selesai</button>
        </div>
      </header>

      {/* VIEWPORT */}
      <main ref={mainRef} className={`flex-1 bg-slate-900 relative overflow-auto scroll-smooth transition-all duration-300 ${isFocusLost ? 'filter blur-[40px] pointer-events-none' : 'filter-none'}`}>
        <div className="transition-transform duration-300 origin-top-left relative" style={{ transform: `scale(${zoomLevel})`, width: `${100 / zoomLevel}%`, minHeight: '100%' }}>
          {hasConsented && session.pdfUrl && (
            <iframe key={iframeKey} src={`${session.pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`} className="w-full border-none" style={{ height: '2000vh', minHeight: '6000px' }} title="Soal" />
          )}
          <div className="absolute inset-0 z-[100] bg-transparent pointer-events-auto"></div>
        </div>
        <div className="absolute inset-0 z-[110] pointer-events-none opacity-[0.02] overflow-hidden">
           <div className="flex flex-wrap rotate-12 scale-150 select-none">
             {[...Array(40)].map((_, i) => (
               <div key={i} className="text-white text-3xl font-black p-32 whitespace-nowrap uppercase">{student.nis} • {student.name}</div>
             ))}
           </div>
        </div>
      </main>

      {/* ZOOM CONTROLS */}
      {hasConsented && (
        <div className="fixed bottom-10 right-4 z-[300] flex flex-col gap-2">
          <button onClick={handleZoomIn} className="w-10 h-10 md:w-12 md:h-12 bg-black/60 backdrop-blur-xl text-white rounded-lg border border-white/10 flex items-center justify-center active:scale-90"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg></button>
          <button onClick={handleZoomOut} className="w-10 h-10 md:w-12 md:h-12 bg-black/60 backdrop-blur-xl text-white rounded-lg border border-white/10 flex items-center justify-center active:scale-90"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" /></svg></button>
        </div>
      )}

      {/* MODERN FINISH CONFIRMATION MODAL */}
      {showConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md p-10 rounded-[3.5rem] shadow-2xl border border-slate-100 text-center animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
            <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            
            <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Selesaikan Ujian?</h3>
            <p className="text-slate-500 text-sm mb-10 leading-relaxed">
              Pastikan semua jawaban telah terisi dengan benar. Setelah mengirim, Anda <span className="text-red-600 font-bold">tidak dapat kembali</span> ke halaman soal ini lagi.
            </p>

            <div className="space-y-4 mb-10">
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-white text-[10px] font-black">1</div>
                <p className="text-xs font-bold text-slate-600 text-left">Jawaban sudah diperiksa ulang</p>
              </div>
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-white text-[10px] font-black">2</div>
                <p className="text-xs font-bold text-slate-600 text-left">Koneksi internet stabil (disarankan)</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={handleFinalFinish} 
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-2xl text-[12px] uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 transition-all active:scale-[0.97]"
              >
                YA, KIRIM JAWABAN
              </button>
              <button 
                onClick={() => setShowConfirm(false)} 
                className="w-full bg-white hover:bg-slate-50 text-slate-400 font-bold py-4 rounded-2xl text-[10px] uppercase tracking-widest transition-all"
              >
                MASIH INGIN MENGECEK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIOLATION MODAL */}
      {isFocusLost && hasConsented && (
        <div className="fixed inset-0 z-[5000] bg-slate-950/90 flex items-center justify-center p-8 backdrop-blur-3xl">
          <div className="bg-white w-full max-w-sm p-10 rounded-[2.5rem] text-center shadow-2xl">
            <h3 className="text-lg font-black text-slate-900 mb-2 uppercase">KEAMANAN AKTIF</h3>
            <div className="bg-red-50 p-6 rounded-[1.5rem] mb-8 border border-red-100">
               <p className="text-[9px] text-red-400 font-black uppercase mb-1">Pelanggaran</p>
               <p className="text-2xl font-black text-red-600">{violations} / {MAX_VIOLATIONS}</p>
            </div>
            <button onClick={() => { setIsFocusLost(false); if(deviceType !== 'iOS' && !isFullscreen) enterFullscreen(); }} className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest">LANJUTKAN</button>
          </div>
        </div>
      )}

      <style>{`
        html, body { overflow: hidden; position: fixed; width: 100%; height: 100%; background: #000; }
        ::-webkit-scrollbar { display: none; }
        .exam-header { height: 3.5rem; }
        .exam-title { font-size: 11px; padding: 0 8px; }
        .student-name { font-size: 11px; }
        .student-info { font-size: 8px; }
        .timer-box { font-size: 11px; padding: 0.4rem 0.6rem; }
        .finish-btn { font-size: 9px; padding: 0.5rem 0.8rem; }
        .refresh-btn { width: 2.1rem; height: 2.1rem; }
        @media (min-width: 768px) {
           .exam-header { height: 6rem; }
           .exam-title { font-size: 1.5rem; }
           .student-name { font-size: 1.25rem; }
           .student-info { font-size: 0.8rem; }
           .timer-box { font-size: 1.5rem; padding: 0.75rem 1.5rem; }
           .finish-btn { font-size: 0.875rem; padding: 0.875rem 2.5rem; }
           .refresh-btn { width: 3.5rem; height: 3.5rem; }
        }
      `}</style>
    </div>
  );
};

export default ExamRoom;
