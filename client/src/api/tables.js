import { getApiBaseUrl } from './config';

export async function getTablesApi(token) {
  const response = await fetch(`${getApiBaseUrl()}/tables`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to fetch tables');
  return data.data;
}

export async function createTableApi(token, tableData) {
  const response = await fetch(`${getApiBaseUrl()}/tables`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(tableData),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to create table');
  return data.data;
}

export async function createBulkTablesApi(token, bulkData) {
  const response = await fetch(`${getApiBaseUrl()}/tables/bulk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(bulkData),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to generate bulk tables');
  return data.data;
}

export async function updateTableApi(token, id, tableData) {
  const response = await fetch(`${getApiBaseUrl()}/tables/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(tableData),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to update table');
  return data.data;
}

export async function deleteTableApi(token, id) {
  const response = await fetch(`${getApiBaseUrl()}/tables/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to delete table');
  return data;
}

/**
 * Public: Validate table QR code for customer scanner
 */
export async function verifyPublicTableApi(restaurantId, tableNumber) {
  const params = new URLSearchParams({
    restaurantId,
    tableNumber,
  });
  const response = await fetch(`${getApiBaseUrl()}/tables/public/verify?${params.toString()}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Invalid table QR code');
  }
  return data;
}
