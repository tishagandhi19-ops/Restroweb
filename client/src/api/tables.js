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
 * Admin: Regenerate a table's QR security token (invalidates older QR codes)
 */
export async function regenerateTableTokenApi(token, id) {
  const response = await fetch(`${getApiBaseUrl()}/tables/${id}/regenerate-token`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to regenerate table QR code');
  return data.data;
}

/**
 * Public: Validate table QR code for customer scanner (via tamper-proof token or tableNumber)
 */
export async function verifyPublicTableApi(firstArg, tokenOrTableNumber, legacyTableNumber) {
  const params = new URLSearchParams();

  if (typeof firstArg === 'object' && firstArg !== null) {
    if (firstArg.restaurantId) params.set('restaurantId', firstArg.restaurantId);
    if (firstArg.token) params.set('token', firstArg.token);
    if (firstArg.tableToken) params.set('token', firstArg.tableToken);
    if (firstArg.tableNumber) params.set('tableNumber', firstArg.tableNumber);
  } else {
    if (firstArg) params.set('restaurantId', firstArg);
    if (tokenOrTableNumber && legacyTableNumber) {
      params.set('token', tokenOrTableNumber);
      params.set('tableNumber', legacyTableNumber);
    } else if (tokenOrTableNumber) {
      params.set('token', tokenOrTableNumber);
      params.set('tableNumber', tokenOrTableNumber);
    }
  }

  const response = await fetch(`${getApiBaseUrl()}/tables/public/verify?${params.toString()}`);
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.message || 'Invalid table QR code');
    error.tampered = Boolean(data.tampered);
    throw error;
  }
  return data;
}
