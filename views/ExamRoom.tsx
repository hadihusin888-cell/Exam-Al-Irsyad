import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Student, ExamSession, StudentStatus } from '../types';

interface ExamRoomProps {
  student: Student;
  students: Student[]; 
  session: ExamSession;
  onFinish: () => void;
}

const ExamRoom: React.FC<ExamRoomProps> = ({ student, students, session, onFinish }) => {
  const [timeLeft, setTimeLeft] = useState(session.durationMinutes * 60);
  const [hasConsented, setHasConsented] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [violations, setViolations] = useState(0);
  const [isFocusLost, setIsFocusLost] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0); 
  const [zoomLevel, setZoomLevel] = useState(1);
  
  // State untuk transparansi kontrol zoom
  const [isZoomVisible, setIsZoomVisible] = useState(true);
  
  // ReturnType<typeof setTimeout> untuk menghindari namespace errors di browser environment
  const zoomTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Script deteksi mobile landscape
  const [isMobileLandscape, setIsMobileLandscape] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const wakeLockRef = useRef<any>(null);
  const lastViolationTime = useRef(0);

  const MAX_VIOLATIONS = 3;
  
  const CLIPPING_TOP = 120;      
  const CLIPPING_BOTTOM = 5000;   
  const CLIPPING_SIDE = 60;      

  const currentStudentData = students.find(s => String(s.nis) === String(student.nis));
  const isBlocked = currentStudentData?.status === StudentStatus.BLOKIR;

  // Fungsi untuk me-reset timer transparansi zoom
  const resetZoomTimer = useCallback(() => {
    setIsZoomVisible(true);
    if (zoomTimerRef.current) clearTimeout(zoomTimerRef.current);
    zoomTimerRef.current = setTimeout(() => {
      setIsZoomVisible(false);
    }, 3000);
  }, []);

  // Reset timer saat pertama kali render setelah ujian dimulai
  useEffect(() => {
    if (hasConsented) {
      resetZoomTimer();
    }
    return () => {
      if (zoomTimerRef.current) clearTimeout(zoomTimerRef.current);
    };
  }, [hasConsented, resetZoomTimer]);

  // Fungsi deteksi device & orientasi
  const checkMobileLandscape = useCallback(() => {
    const isLandscape = window.innerWidth > window.innerHeight;
    const isMobileHeight = window.innerHeight <= 500;
    setIsMobileLandscape(isLandscape && isMobileHeight);
  }, []);

  useEffect(() => {
    checkMobileLandscape();
    window.addEventListener('resize', checkMobileLandscape);
    window.addEventListener('orientationchange', checkMobileLandscape);
    return () => {
      window.removeEventListener('resize', checkMobileLandscape);
      window.removeEventListener('orientationchange', checkMobileLandscape);
    };
  }, [checkMobileLandscape]);

  const sanitizePdfUrl = (url: string) => {
    if (!url) return '';
    let sanitized = url;
    if (url.includes('drive.google.com')) {
      sanitized = url.replace(/\/view(\?.*)?$/, '/preview');
      if (!sanitized.includes('/preview')) {
        sanitized = sanitized.replace(/\/edit(\?.*)?$/, '/preview');
      }
      const separator = sanitized.includes('?') ? '&' : '?';
      sanitized = `${sanitized}${separator}rm=minimal`;
    }
    return sanitized;
  };

  const handleZoom = (delta: number) => {
    setZoomLevel(prev => Math.min(Math.max(prev + delta, 0.5), 3.0));
    resetZoomTimer();
  };

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
    if (isBlocked) return;
    const now = Date.now();
    if (now - lastViolationTime.current < 2500) return; 
    lastViolationTime.current = now;
    setIsFocusLost(true);
    setViolations(v => v + 1);
  }, [isBlocked]);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && (e.key === 'p' || e.key === 's' || e.key === 'u')) ||
        e.key === 'F12'
      ) {
        e.preventDefault();
        triggerViolation("Unauthorized Shortcut");
      }
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [triggerViolation]);

  const handleRefreshPDF = () => {
    setIframeKey(prev => prev + 1);
    setZoomLevel(1);
    resetZoomTimer();
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);

    const timer = setInterval(() => {
      if (hasConsented && timeLeft > 0 && !isBlocked) setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      clearInterval(timer);
      releaseWakeLock();
    };
  }, [hasConsented, timeLeft, releaseWakeLock, isBlocked]);

  useEffect(() => {
    if (!hasConsented || isBlocked) return;
    const handleVisibilityChange = () => { if (document.hidden) triggerViolation("App Switched"); };
    const handleBlur = () => triggerViolation("Window Blur");
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [hasConsented, triggerViolation, isBlocked]);

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

  useEffect(() => {
    if (violations >= MAX_VIOLATIONS) {
      onFinish();
    }
  }, [violations, onFinish]);

  return (
    <div 
      className="flex flex-col h-[100dvh] w-screen overflow-hidden select-none bg-slate-950 font-sans relative"
      onClick={resetZoomTimer}
      onTouchStart={resetZoomTimer}
    >
      <video ref={videoRef} className="hidden" aria-hidden="true" muted playsInline />

      {/* MODAL BLOKIR */}
      {isBlocked && (
        <div className="fixed inset-0 z-[10000] bg-red-600 flex items-center justify-center p-6 backdrop-blur-xl">
          <div className="bg-white w-full max-sm p-10 rounded-[3rem] text-center shadow-2xl">
            <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tighter">Akses Diblokir</h2>
            <p className="text-slate-500 text-xs font-bold uppercase mb-10">Ujian dihentikan oleh Proktor.</p>
            <button onClick={() => onFinish()} className="w-full bg-red-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">KONFIRMASI & KELUAR</button>
          </div>
        </div>
      )}

      {/* OVERLAY START */}
      {!hasConsented && !isBlocked && (
        <div className="fixed inset-0 z-[1000] bg-slate-950 flex items-center justify-center p-6 backdrop-blur-md">
          <div className="bg-white w-full max-w-sm p-10 rounded-[3rem] text-center shadow-2xl border-t-8 border-indigo-600">
            <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-3 uppercase tracking-tight leading-none">Konfirmasi Ujian</h2>
            <p className="text-slate-500 text-[11px] font-medium leading-relaxed mb-10">
              Sistem akan mengaktifkan <span className="text-indigo-600 font-bold">Mode Proteksi Layar</span> secara otomatis. Pastikan koneksi internet stabil dan jangan keluar dari aplikasi selama ujian berlangsung.
            </p>
            <button onClick={startPersistence} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.15em] shadow-xl shadow-indigo-200 transition-all active:scale-95">
              Mulai Ujian Sekarang
            </button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className={`shrink-0 z-50 border-b border-white/5 bg-black/80 backdrop-blur-2xl flex items-center px-4 md:px-10 transition-all duration-300 ${isMobileLandscape ? 'h-8 px-3' : 'h-14 md:h-16'}`}>
        <div className="flex-1 overflow-hidden">
          <h2 className={`text-white font-black uppercase truncate ${isMobileLandscape ? 'text-[8px]' : 'text-[10px] md:text-sm'}`}>{student.name}</h2>
          <span className={`text-indigo-400 font-bold uppercase tracking-widest ${isMobileLandscape ? 'text-[6px]' : 'text-[8px] md:text-[10px]'}`}>Kelas {student.class} | {student.nis}</span>
        </div>
        <div className={`flex-1 text-center ${isMobileLandscape ? 'hidden' : 'hidden sm:block'}`}>
          <h1 className="text-white font-black uppercase tracking-tighter truncate text-xs md:text-lg">{session.name}</h1>
        </div>
        <div className={`flex-1 flex items-center justify-end transition-all ${isMobileLandscape ? 'gap-2' : 'gap-3 md:gap-4'}`}>
          <button onClick={handleRefreshPDF} className={`bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-all active:scale-90 ${isMobileLandscape ? 'p-1' : 'p-2 md:p-3'}`} title="Refresh Soal">
            <svg xmlns="http://www.w3.org/2000/svg" className={`${isMobileLandscape ? 'h-3 w-3' : 'h-4 w-4 md:h-5 md:w-5'} ${iframeKey > 0 ? 'animate-spin-once' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <div className={`font-mono font-black ${isMobileLandscape ? 'text-xs' : 'text-sm md:text-lg'} ${timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-indigo-400'}`}>
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </div>
          <button onClick={() => setShowConfirm(true)} className={`bg-emerald-500 text-white rounded-xl font-black uppercase tracking-widest shadow-lg active:scale-90 transition-all ${isMobileLandscape ? 'px-3 py-1 text-[7px]' : 'px-4 md:px-8 py-2 md:py-3 text-[9px] md:text-xs'}`}>Selesai</button>
        </div>
      </header>

      <main className={`flex-1 bg-slate-900 relative transition-all duration-300 overflow-hidden ${isFocusLost || isBlocked ? 'blur-3xl pointer-events-none' : ''}`}>
        <div className="w-full h-full overflow-auto scrollbar-hide">
          <div className="w-full h-full relative transition-transform duration-300 ease-out origin-top" style={{ transform: `scale(${zoomLevel})` }}>
            <div className="relative w-full h-full overflow-hidden" style={{ marginTop: `-${CLIPPING_TOP}px`, marginLeft: `-${CLIPPING_SIDE}px`, width: `calc(100% + ${CLIPPING_SIDE * 2}px)`, height: `calc(100% + ${CLIPPING_TOP + CLIPPING_BOTTOM}px)` }}>
              {hasConsented && session.pdfUrl && (
                <iframe key={iframeKey} src={sanitizePdfUrl(session.pdfUrl)} className="w-full h-full border-none" title="Soal PDF" />
              )}
            </div>
          </div>
        </div>

        {/* FLOATING ZOOM CONTROLS - Dengan efek transparansi otomatis (opacity-15) dan tetap bisa ditekan */}
        <div className={`absolute transition-all duration-500 z-[200] items-center flex bg-black/40 backdrop-blur-xl border border-white/10 rounded-[1.5rem] shadow-2xl transition-opacity pointer-events-auto
          ${isZoomVisible ? 'opacity-40 hover:opacity-100' : 'opacity-[0.15] hover:opacity-100'}
          ${isMobileLandscape 
            ? 'top-1/2 right-2 bottom-auto translate-y-[-50%] flex-col scale-[0.65] p-1.5' 
            : 'bottom-6 right-4 flex-col md:bottom-10 md:left-1/2 md:right-auto md:translate-x-[-50%] md:flex-row md:scale-100 max-md:scale-[0.8] max-md:bottom-4 p-2'}`}>
           
           <button onClick={(e) => { e.stopPropagation(); handleZoom(0.1); }} className="w-10 h-10 md:w-11 md:h-11 flex items-center justify-center bg-white/5 hover:bg-indigo-600 text-white rounded-xl transition-all active:scale-90">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
             </svg>
           </button>
           
           <div className="px-1 min-w-[50px] md:min-w-[60px] text-center">
              <span className="text-[10px] md:text-xs font-black text-indigo-400 uppercase">{Math.round(zoomLevel * 100)}%</span>
           </div>

           <button onClick={(e) => { e.stopPropagation(); handleZoom(-0.1); }} className="w-10 h-10 md:w-11 md:h-11 flex items-center justify-center bg-white/5 hover:bg-indigo-600 text-white rounded-xl transition-all active:scale-90">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
             </svg>
           </button>

           <div className={`bg-white/10 my-1 md:my-0 md:mx-2 ${isMobileLandscape ? 'w-6 h-px' : 'w-6 h-px md:w-px md:h-6'}`}></div>

           <button onClick={(e) => { e.stopPropagation(); setZoomLevel(1); resetZoomTimer(); }} className="w-10 h-10 md:px-5 md:h-11 flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">
             <span className="md:inline hidden">Reset</span><span className="md:hidden">R</span>
           </button>
        </div>

        {/* Watermark Anticam */}
        <div className="absolute inset-0 z-[90] pointer-events-none opacity-[0.03] overflow-hidden">
           <div className="flex flex-wrap -rotate-[25deg] scale-[3] absolute -inset-[150%] w-[400%] h-[400%] items-center justify-center content-center">
             {[...Array(200)].map((_, i) => (
               <div key={i} className="text-white text-[8px] font-black p-12 uppercase tracking-[0.4em]">{student.nis} {student.name}</div>
             ))}
           </div>
        </div>
      </main>

      {/* MODAL FINISH */}
      {showConfirm && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-[320px] md:max-w-[400px] p-8 md:p-10 rounded-[2.5rem] shadow-2xl text-center border-t-8 border-emerald-500 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 md:h-10 md:w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight leading-none">Akhiri Sesi?</h3>
            <div className="space-y-3 mb-8">
              <p className="text-slate-500 text-[10px] md:text-xs font-medium leading-relaxed">
                Ini adalah ujian <span className="text-indigo-600 font-bold">Semi-Online</span>. Pastikan seluruh jawaban Anda telah disalin ke <span className="text-emerald-600 font-bold underline">Lembar Jawab Fisik</span>.
              </p>
            </div>
            <div className="flex flex-col gap-2.5">
              <button onClick={() => onFinish()} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 md:py-5 rounded-2xl font-black text-[10px] md:text-[11px] uppercase tracking-[0.15em] shadow-lg shadow-emerald-100 active:scale-95 transition-all">
                Selesai & Keluar
              </button>
              <button onClick={() => setShowConfirm(false)} className="w-full text-slate-400 font-bold py-2 md:py-3 text-[9px] md:text-[10px] uppercase tracking-[0.1em] hover:text-slate-600 transition-colors">
                Kembali ke Soal
              </button>
            </div>
          </div>
        </div>
      )}

      {isFocusLost && hasConsented && !isBlocked && (
        <div className="fixed inset-0 z-[5000] bg-slate-950/95 flex items-center justify-center p-8 backdrop-blur-xl">
          <div className="bg-white w-full max-w-sm p-10 rounded-3xl text-center shadow-2xl border-b-8 border-red-500">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-6 uppercase tracking-tight">Pelanggaran ({violations}/{MAX_VIOLATIONS})</h3>
            <button onClick={() => { setIsFocusLost(false); if(!isFullscreen) document.documentElement.requestFullscreen().catch(()=>{}); }} className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase shadow-lg">Kembali ke Ujian</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin-once { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-once { animation: spin-once 0.6s cubic-bezier(0.4, 0, 0.2, 1); }
        iframe { pointer-events: auto !important; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default ExamRoom;