
export const syncToCloud = async (url: string, data: any) => {
  // Validasi: Jangan kirim jika data krusial kosong (mencegah penghapusan tidak sengaja)
  if (!data.students || data.students.length === 0) {
    console.warn("Sinkronisasi dibatalkan: Data siswa kosong. Mencegah potensi data loss.");
    return false;
  }

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
    // Karena no-cors, kita tidak bisa membaca response body, 
    // tapi kita asumsikan fetch sukses jika tidak melempar error
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
    const cacheBuster = `cb=${Date.now()}`;
    const finalUrl = url.includes('?') ? `${url}&${cacheBuster}` : `${url}?${cacheBuster}`;
    
    const response = await fetch(finalUrl, { 
      method: 'GET',
      cache: 'no-store'
    });
    
    if (!response.ok) throw new Error(`Server error: ${response.status}`);
    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error("Database cloud tidak terjangkau:", error.message);
    return null;
  }
};
