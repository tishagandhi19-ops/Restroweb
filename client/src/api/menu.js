import { getApiBaseUrl } from './config';

export async function getMenuItemsApi(token) {
  const response = await fetch(`${getApiBaseUrl()}/menu`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to fetch menu');
  return data.data;
}

export async function createMenuItemApi(token, itemData) {
  const response = await fetch(`${getApiBaseUrl()}/menu`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(itemData),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to create menu item');
  return data.data;
}

export async function updateMenuItemApi(token, id, itemData) {
  const response = await fetch(`${getApiBaseUrl()}/menu/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(itemData),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to update menu item');
  return data.data;
}

export async function deleteMenuItemApi(token, id) {
  const response = await fetch(`${getApiBaseUrl()}/menu/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to delete menu item');
  return data;
}

export async function getPublicMenuApi(restaurantId) {
  const response = await fetch(`${getApiBaseUrl()}/menu/public/${restaurantId}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to fetch public menu');
  return data;
}
