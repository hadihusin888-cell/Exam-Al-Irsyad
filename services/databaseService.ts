
/**
 * Database Service - Examsy
 * Menggunakan teknik "Simple Request" untuk menghindari CORS Preflight
 */

const callApi = async (url: string, payload: any) => {
  try {
    // Kita kirim sebagai text/plain agar browser tidak melakukan preflight OPTIONS request
    // Google Apps Script tetap bisa membaca body ini sebagai JSON string.
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify(payload),
    });
    return true;
  } catch (error) {
    console.error("Cloud Sync Error:", error);
    return false;
  }
};

export const syncToCloud = async (url: string, data: any) => {
  return callApi(url, {
    action: 'SYNC_ALL',
    ...data
  });
};

export const updateStudentInCloud = async (url: string, nis: string, status: string) => {
  return callApi(url, {
    action: 'UPDATE_STUDENT_STATUS',
    nis: nis,
    status: status
  });
};

export const fetchFromCloud = async (url: string) => {
  try {
    // Tambahkan timestamp untuk menghindari cache browser yang menyimpan "failed redirect"
    const cacheBuster = `t=${Date.now()}`;
    const finalUrl = url.includes('?') ? `${url}&${cacheBuster}` : `${url}?${cacheBuster}`;

    const response = await fetch(finalUrl, { 
      method: 'GET',
      // Menggunakan default (cors/follow) tanpa header kustom agar redirect lancar
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error: any) {
    console.warn("Fetch Error (Cloud):", error.message);
    return null;
  }
};
