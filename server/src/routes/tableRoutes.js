import express from 'express';
import {
  getTables,
  createTable,
  createBulkTables,
  updateTable,
  deleteTable,
  verifyPublicTable,
} from '../controllers/tableController.js';
import { protectAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public route for QR scan verification
router.get('/public/verify', verifyPublicTable);

router.use(protectAdmin);

router.route('/').get(getTables).post(createTable);
router.post('/bulk', createBulkTables);
router.route('/:id').put(updateTable).delete(deleteTable);

export default router;
