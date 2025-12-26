
export const syncToCloud = async (url: string, data: any) => {
  try {
    const response = await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'SYNC_ALL',
        ...data
      }),
    });
    return true;
  } catch (error) {
    console.error("Gagal sinkronisasi otomatis ke cloud:", error);
    return false;
  }
};

export const updateStudentInCloud = async (url: string, nis: string, status: string) => {
  try {
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'UPDATE_STUDENT_STATUS',
        nis: nis,
        status: status
      }),
    });
    return true;
  } catch (error) {
    console.error("Gagal update status siswa:", error);
    return false;
  }
};

export const fetchFromCloud = async (url: string) => {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 20000); 

    const response = await fetch(url, { 
      signal: controller.signal,
      cache: 'no-store'
    });
    clearTimeout(id);
    
    if (!response.ok) throw new Error(`Server returned ${response.status}`);
    return await response.json();
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.warn("Koneksi Database Timeout (20s). Mencoba menggunakan data lokal...");
    } else {
      console.error("Database cloud tidak terjangkau:", error.message);
    }
    return null;
  }
};
