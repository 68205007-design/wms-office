import axios from "axios";

const loopbackHosts = new Set(["localhost", "127.0.0.1", "::1"]);
const pageHost = window.location.hostname;
const configuredApiUrl = import.meta.env.VITE_API_URL;
// ถ้ากำหนด VITE_GAS_URL จะใช้ Backend บน Google Apps Script แทน Express
const gasUrl = import.meta.env.VITE_GAS_URL;
const configuredApiHost = configuredApiUrl
  ? new URL(configuredApiUrl, window.location.origin).hostname
  : null;
const apiBaseUrl = configuredApiUrl && (loopbackHosts.has(pageHost) || !loopbackHosts.has(configuredApiHost))
  ? configuredApiUrl
  : `${window.location.protocol}//${pageHost}:4000/api`;

export const usingAppsScript = Boolean(gasUrl);

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(",")[1]);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const base64ToBlob = (base64, type) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
};

/**
 * ส่งทุกคำขอเป็น POST แบบ text/plain ไปยัง Apps Script (ไม่มี CORS preflight)
 * แล้วแปลงผลลัพธ์กลับเป็นรูปแบบ axios ให้หน้าเว็บเดิมใช้งานได้เหมือนเดิม
 */
async function appsScriptAdapter(config) {
  let body = config.data;
  if (typeof FormData !== "undefined" && body instanceof FormData) {
    const file = body.get("image");
    body = file ? { file: { name: file.name, type: file.type, base64: await fileToBase64(file) } } : {};
  } else if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { /* keep as is */ }
  }
  const query = {};
  Object.entries(config.params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query[key] = value;
  });
  let payload;
  try {
    const response = await fetch(gasUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        method: (config.method || "get").toUpperCase(),
        path: config.url,
        query,
        body: body ?? null,
        token: localStorage.getItem("wms-token")
      })
    });
    payload = await response.json();
  } catch {
    const error = new Error("ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่อีกครั้ง");
    error.config = config;
    throw error;
  }
  const data = payload.file
    ? base64ToBlob(payload.file.base64, payload.file.mimeType)
    : payload.body;
  const result = { data, status: payload.status, statusText: "", headers: {}, config, request: null };
  if (payload.status >= 400) {
    const error = new Error(data?.message || "Request failed");
    error.response = result;
    error.config = config;
    throw error;
  }
  return result;
}

export const api = axios.create({
  baseURL: gasUrl ? "" : apiBaseUrl,
  timeout: 90000,
  ...(gasUrl ? { adapter: appsScriptAdapter } : {})
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("wms-token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.endsWith("/auth/login")) {
      localStorage.removeItem("wms-token");
      window.dispatchEvent(new Event("wms:unauthorized"));
    }
    return Promise.reject(error);
  }
);

export const getErrorMessage = (error) =>
  error.response?.data?.message || error.message || "ไม่สามารถเชื่อมต่อระบบได้";

/** สร้าง URL รูปสินค้า: รองรับทั้ง URL เต็ม (Google Drive) และ path ของ Backend เดิม */
export const productImageSrc = (imageUrl) => {
  if (!imageUrl) return null;
  if (/^https?:\/\//.test(imageUrl)) return imageUrl;
  return `${configuredApiUrl?.replace(/\/api$/, "") || "http://localhost:4000"}${imageUrl}`;
};
