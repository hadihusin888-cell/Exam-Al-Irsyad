
export const fetchFromCloud = async (url: string) => {
  try {
    const cacheBuster = `cb=${Date.now()}`;
    const finalUrl = url.includes('?') ? `${url}&${cacheBuster}` : `${url}?${cacheBuster}`;
    const response = await fetch(finalUrl, { method: 'GET', cache: 'no-store' });
    const result = await response.json();
    return result.success ? result.data : null;
  } catch (error) {
    console.error("Gagal mengambil data:", error);
    return null;
  }
};

export const callCloudAction = async (url: string, action: string, payload: any) => {
  try {
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ action, payload }),
    });
    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error(`Action ${action} failed:`, error);
    return false;
  }
};
