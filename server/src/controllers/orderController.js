import Order from '../models/Order.js';
import Admin from '../models/Admin.js';

// @desc    Guest places order for a specific table after scanning QR code
// @route   POST /api/orders/public
// @access  Public (Guest at table)
export const createPublicOrder = async (req, res) => {
  try {
    const { restaurantId, tableNumber, items, totalAmount, notes, customerName, customerPhone } = req.body;

    if (!restaurantId || !tableNumber || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must include restaurant, table number, and at least one item.',
      });
    }

    const admin = await Admin.findById(restaurantId);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found.',
      });
    }

    const order = await Order.create({
      admin: restaurantId,
      tableNumber: String(tableNumber).trim(),
      customerName: customerName ? String(customerName).trim() : 'Guest',
      customerPhone: customerPhone ? String(customerPhone).trim() : '',
      items,
      totalAmount: Number(totalAmount) || 0,
      notes: notes ? notes.trim() : '',
      status: 'Received',
    });

    return res.status(201).json({
      success: true,
      message: `Order placed successfully for Table ${tableNumber}!`,
      data: order,
    });
  } catch (error) {
    console.error('createPublicOrder error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to place order.',
    });
  }
};

// @desc    Get all orders for the logged-in restaurant admin
// @route   GET /api/orders
// @access  Private (Admin)
export const getRestaurantOrders = async (req, res) => {
  try {
    const orders = await Order.find({ admin: req.admin._id }).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    console.error('getRestaurantOrders error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch restaurant orders.',
    });
  }
};

// @desc    Update order status (e.g. Preparing, Served)
// @route   PUT /api/orders/:id/status
// @access  Private (Admin)
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await Order.findOne({ _id: id, admin: req.admin._id });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    if (status) {
      order.status = status;
      await order.save();
    }

    return res.status(200).json({
      success: true,
      message: `Order status updated to ${status}.`,
      data: order,
    });
  } catch (error) {
    console.error('updateOrderStatus error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update order status.',
    });
  }
};

// @desc    Get real-time status of orders placed during current customer dining session
// @route   POST /api/orders/public/session-orders
// @access  Public (Guest seated at table)
export const getSessionOrders = async (req, res) => {
  try {
    const { orderIds, restaurantId, tableNumber, customerPhone, since } = req.body;

    const queryFilters = [];

    // Filter 1: Explicit order IDs from this session
    if (Array.isArray(orderIds) && orderIds.length > 0) {
      queryFilters.push({ _id: { $in: orderIds } });
    }

    // Filter 2: Session-based fallback strictly created on or after session start time
    if (restaurantId && tableNumber && since) {
      const sessionStart = new Date(Number(since) || since);
      if (!isNaN(sessionStart.getTime())) {
        const fallbackQuery = {
          admin: restaurantId,
          tableNumber: String(tableNumber).trim(),
          createdAt: { $gte: sessionStart },
        };
        if (customerPhone) {
          fallbackQuery.customerPhone = String(customerPhone).trim();
        }
        queryFilters.push(fallbackQuery);
      }
    }

    if (queryFilters.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
      });
    }

    // Find orders that match either the session orderIds OR current session timestamp filter
    const orders = await Order.find({ $or: queryFilters }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    console.error('getSessionOrders error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve session orders.',
    });
  }
};
