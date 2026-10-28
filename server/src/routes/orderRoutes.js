import express from 'express';
import {
  createPublicOrder,
  getSessionOrders,
  getRestaurantOrders,
  updateOrderStatus,
} from '../controllers/orderController.js';
import { protectAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes for diners seated at tables scanning QR code
router.post('/public', createPublicOrder);
router.post('/public/session-orders', getSessionOrders);

// Protected routes for restaurant admin
router.use(protectAdmin);
router.get('/', getRestaurantOrders);
router.put('/:id/status', updateOrderStatus);

export default router;
