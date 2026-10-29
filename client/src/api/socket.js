import { io } from 'socket.io-client';
import { getSocketUrl } from './config';

let socket = null;

/**
 * Get or initialize the Socket.io client instance
 */
export const getSocket = () => {
  if (!socket) {
    const socketUrl = getSocketUrl();
    socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socket.on('connect', () => {
      console.log('⚡ Socket connected to server:', socketUrl, `(id: ${socket.id})`);
    });

    socket.on('disconnect', (reason) => {
      console.log('⚡ Socket disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.warn('⚠️ Socket connection error:', err.message);
    });
  }
  return socket;
};

/**
 * Join restaurant admin room for receiving new incoming orders
 */
export const joinRestaurantRoom = (restaurantId) => {
  const s = getSocket();
  if (s && restaurantId) {
    s.emit('join_restaurant', restaurantId);
  }
};

/**
 * Leave restaurant admin room
 */
export const leaveRestaurantRoom = (restaurantId) => {
  const s = getSocket();
  if (s && restaurantId) {
    s.emit('leave_restaurant', restaurantId);
  }
};

/**
 * Join specific table room for real-time customer status updates
 */
export const joinTableRoom = (restaurantId, tableNumber) => {
  const s = getSocket();
  if (s && restaurantId && tableNumber) {
    s.emit('join_table', { restaurantId, tableNumber: String(tableNumber).trim() });
  }
};

/**
 * Leave table room
 */
export const leaveTableRoom = (restaurantId, tableNumber) => {
  const s = getSocket();
  if (s && restaurantId && tableNumber) {
    s.emit('leave_table', { restaurantId, tableNumber: String(tableNumber).trim() });
  }
};

/**
 * Disconnect socket cleanly
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
