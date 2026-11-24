import axios from 'axios';

const TOKEN_KEY = 'wms_token';

export const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
/** origin ของ backend (ใช้ประกอบ URL รูปภาพที่เป็น path สัมพัทธ์) */
export const API_ORIGIN = API_URL.startsWith('http') ? API_URL.replace(/\/api$/, '') : '';

export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (t) => {
    try {
      localStorage.setItem(TOKEN_KEY, t);
    } catch {
      /* ignore */
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

const api = axios.create({ baseURL: API_URL, timeout: 30000 });

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    if (status === 401 && !url.includes('/auth/login')) {
      tokenStore.clear();
      onUnauthorized?.(error.response?.data?.message);
    }
    return Promise.reject(error);
  },
);

/** ดึงข้อความ error ภาษาไทยจาก response */
export function errorMessage(err, fallback = 'เกิดข้อผิดพลาด กรุณาลองใหม่') {
  if (!err?.response) return err?.code === 'ECONNABORTED' ? 'เชื่อมต่อเซิร์ฟเวอร์นานเกินไป' : 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้';
  const d = err.response.data;
  if (d?.details?.length) return `${d.message}: ${d.details.map((x) => x.message).join(', ')}`;
  return d?.message || fallback;
}

export function imageSrc(url) {
  if (!url) return null;
  if (/^https?:\/\//.test(url)) return url;
  return `${API_ORIGIN}${url}`;
}

export default api;
