
export const fetchFromCloud = async (url: string) => {
  try {
    // Gunakan cache buster untuk menghindari data lama (stale)
    const cacheBuster = `cb=${Date.now()}`;
    const finalUrl = url.includes('?') ? `${url}&${cacheBuster}` : `${url}?${cacheBuster}`;
    
    // Google Apps Script memerlukan redirect: 'follow' (default) 
    // dan seringkali gagal jika ada header custom yang memicu preflight OPTIONS
    const response = await fetch(finalUrl, { 
      method: 'GET',
      mode: 'cors',
      redirect: 'follow'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const result = await response.json();
    return result.success ? result.data : null;
  } catch (error) {
    console.error("Gagal mengambil data dari Google Script:", error);
    // Kembalikan null agar App.tsx bisa menangani status error
    return null;
  }
};

export const callCloudAction = async (url: string, action: string, payload: any) => {
  try {
    // PENTING: Jangan set Content-Type: application/json secara manual.
    // Fetch akan mengirimkan body string sebagai text/plain secara default.
    // Ini dianggap sebagai 'Simple Request' oleh browser dan menghindari 'Preflight OPTIONS'
    // yang tidak didukung oleh Google Apps Script.
    const response = await fetch(url, {
      method: 'POST',
      mode: 'cors',
      redirect: 'follow',
      body: JSON.stringify({ action, payload }),
    });
    
    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error(`Action ${action} failed:`, error);
    return false;
  }
};
