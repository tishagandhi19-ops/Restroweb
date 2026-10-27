const API_URL = 'http://localhost:5000/api/menu';

export async function getMenuItemsApi(token) {
  const response = await fetch(API_URL, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to fetch menu');
  return data.data;
}

export async function createMenuItemApi(token, itemData) {
  const response = await fetch(API_URL, {
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
  const response = await fetch(`${API_URL}/${id}`, {
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
  const response = await fetch(`${API_URL}/${id}`, {
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
  const response = await fetch(`${API_URL}/public/${restaurantId}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to fetch public menu');
  return data;
}
