/**
 * Dynamic API Base URL resolver:
 * Automatically uses current hostname if accessed on mobile phone via Wi-Fi QR scan,
 * or environment variable / default backend endpoint.
 */
export const getApiBaseUrl = () => {
  if (import.meta.env?.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost') {
    return `https://restroweb-aox0.onrender.com/api`;
  }
  return 'https://restroweb-aox0.onrender.com/api';
};

/**
 * Socket.io Server URL resolver (origin without trailing /api)
 */
export const getSocketUrl = () => {
  if (import.meta.env?.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  const apiBase = getApiBaseUrl();
  return apiBase.replace(/\/api\/?$/, '');
};
