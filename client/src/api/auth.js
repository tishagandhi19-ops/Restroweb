const API_BASE_URL = 'http://localhost:5000/api/auth';
const HEALTH_URL = 'http://localhost:5000/api/health';

/**
 * Helper to safely extract error message from response or throw descriptive network error
 */
async function parseApiResponse(response) {
  let data;
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch (e) {
      data = { message: 'Failed to parse JSON response from server.' };
    }
  } else {
    const text = await response.text();
    data = { message: text || `Server responded with status ${response.status} (${response.statusText})` };
  }

  if (!response.ok) {
    const message = data.message || `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

/**
 * Check if the backend server is reachable
 */
export async function checkBackendHealthApi() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const response = await fetch(HEALTH_URL, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return { online: true, dbState: data.dbState, message: data.message };
    }
    return { online: false, message: 'Server is responding with error status' };
  } catch (err) {
    return {
      online: false,
      message: 'Server unreachable at http://localhost:5000. Please ensure the backend is running.',
    };
  }
}

/**
 * Register a new Admin
 */
export async function registerAdminApi(userData) {
  try {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    return await parseApiResponse(response);
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      const netError = new Error('Cannot connect to RestoWeb Server (http://localhost:5000). Please ensure your backend is started.');
      netError.isNetworkError = true;
      throw netError;
    }
    throw err;
  }
}

/**
 * Login existing Admin
 */
export async function loginAdminApi(credentials) {
  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    return await parseApiResponse(response);
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      const netError = new Error('Cannot connect to RestoWeb Server (http://localhost:5000). Please ensure your backend is started.');
      netError.isNetworkError = true;
      throw netError;
    }
    throw err;
  }
}

/**
 * Fetch current Admin Profile
 */
export async function getAdminProfileApi(token) {
  try {
    const response = await fetch(`${API_BASE_URL}/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    return await parseApiResponse(response);
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      const netError = new Error('Cannot connect to RestoWeb Server.');
      netError.isNetworkError = true;
      throw netError;
    }
    throw err;
  }
}
