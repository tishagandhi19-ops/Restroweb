import express from 'express';
import {
  createPublicOrder,
  getRestaurantOrders,
  updateOrderStatus,
} from '../controllers/orderController.js';
import { protectAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public route for diners seated at tables scanning QR code
router.post('/public', createPublicOrder);

// Protected routes for restaurant admin
router.use(protectAdmin);
router.get('/', getRestaurantOrders);
router.put('/:id/status', updateOrderStatus);

export default router;
