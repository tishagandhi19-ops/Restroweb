import { getApiBaseUrl } from './config';

/**
 * Guest places order for their table
 */
export async function placeTableOrderApi(orderData) {
  const response = await fetch(`${getApiBaseUrl()}/orders/public`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderData),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to place order.');
  return data.data;
}

/**
 * Public: Get real-time status of orders placed in the current session
 */
export async function getSessionOrdersApi(payload) {
  const response = await fetch(`${getApiBaseUrl()}/orders/public/session-orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to fetch session orders.');
  return data.data || [];
}

/**
 * Admin retrieves all restaurant orders
 */
export async function getRestaurantOrdersApi(token) {
  const response = await fetch(`${getApiBaseUrl()}/orders`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to fetch orders.');
  return data.data;
}

/**
 * Admin updates order status
 */
export async function updateOrderStatusApi(token, id, status) {
  const response = await fetch(`${getApiBaseUrl()}/orders/${id}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to update order status.');
  return data.data;
}
