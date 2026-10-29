import { Server } from 'socket.io';

let ioInstance = null;

/**
 * Initialize Socket.io instance with HTTP Server
 */
export const initSocket = (httpServer) => {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: '*', // Allow frontend client connections
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  ioInstance.on('connection', (socket) => {
    console.log(`🔌 New client connected: ${socket.id}`);

    // Restaurant Admin joins their restaurant room
    socket.on('join_restaurant', (restaurantId) => {
      if (restaurantId) {
        const room = `restaurant:${restaurantId}`;
        socket.join(room);
        console.log(`📡 Socket ${socket.id} joined ${room}`);
      }
    });

    // Restaurant Admin leaves room
    socket.on('leave_restaurant', (restaurantId) => {
      if (restaurantId) {
        const room = `restaurant:${restaurantId}`;
        socket.leave(room);
        console.log(`📡 Socket ${socket.id} left ${room}`);
      }
    });

    // Seated diner joins their specific table room
    socket.on('join_table', ({ restaurantId, tableNumber }) => {
      if (restaurantId && tableNumber) {
        const room = `table:${restaurantId}:${String(tableNumber).trim()}`;
        socket.join(room);
        console.log(`📡 Socket ${socket.id} joined table room ${room}`);
      }
    });

    // Seated diner leaves table room
    socket.on('leave_table', ({ restaurantId, tableNumber }) => {
      if (restaurantId && tableNumber) {
        const room = `table:${restaurantId}:${String(tableNumber).trim()}`;
        socket.leave(room);
        console.log(`📡 Socket ${socket.id} left table room ${room}`);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Client disconnected: ${socket.id} (${reason})`);
    });
  });

  return ioInstance;
};

/**
 * Access initialized Socket.io instance
 */
export const getIO = () => {
  if (!ioInstance) {
    console.warn('⚠️ getIO called before initSocket was executed');
  }
  return ioInstance;
};
