/**
 * Dynamic API Base URL resolver:
 * Automatically uses current hostname (e.g. 192.168.1.7) if accessed on mobile phone via Wi-Fi QR scan,
 * or localhost:5000 if accessed directly on the machine.
 */
export const getApiBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost') {
    return `http://${window.location.hostname}:5000/api`;
  }
  return 'http://localhost:5000/api';
};
