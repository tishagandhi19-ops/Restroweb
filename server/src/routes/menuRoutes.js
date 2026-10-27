import express from 'express';
import {
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getPublicMenu,
} from '../controllers/menuController.js';
import { protectAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public route for customer table ordering
router.get('/public/:restaurantId', getPublicMenu);

// Protected admin routes
router.use(protectAdmin);
router.route('/').get(getMenuItems).post(createMenuItem);
router.route('/:id').put(updateMenuItem).delete(deleteMenuItem);

export default router;
