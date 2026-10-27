import MenuItem from '../models/MenuItem.js';
import Admin from '../models/Admin.js';

// @desc    Get all menu items for the logged-in admin
// @route   GET /api/menu
// @access  Private (Admin)
export const getMenuItems = async (req, res) => {
  try {
    const items = await MenuItem.find({ admin: req.admin._id }).sort({ category: 1, createdAt: -1 });
    return res.status(200).json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    console.error('getMenuItems error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch menu items.',
    });
  }
};

// @desc    Create a new menu item
// @route   POST /api/menu
// @access  Private (Admin)
export const createMenuItem = async (req, res) => {
  try {
    const { name, description, price, category, isAvailable, imageUrl } = req.body;

    if (!name || price === undefined || price === null) {
      return res.status(400).json({
        success: false,
        message: 'Item name and price are required.',
      });
    }

    const item = await MenuItem.create({
      admin: req.admin._id,
      name: name.trim(),
      description: description ? description.trim() : '',
      price: Number(price),
      category: category ? category.trim() : 'Main Course',
      isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
      imageUrl: imageUrl ? imageUrl.trim() : '',
    });

    return res.status(201).json({
      success: true,
      message: 'Menu item created successfully!',
      data: item,
    });
  } catch (error) {
    console.error('createMenuItem error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create menu item.',
    });
  }
};

// @desc    Update an existing menu item
// @route   PUT /api/menu/:id
// @access  Private (Admin)
export const updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, category, isAvailable, imageUrl } = req.body;

    const item = await MenuItem.findOne({ _id: id, admin: req.admin._id });
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found or you are not authorized to edit it.',
      });
    }

    if (name !== undefined) item.name = name.trim();
    if (description !== undefined) item.description = description.trim();
    if (price !== undefined) item.price = Number(price);
    if (category !== undefined) item.category = category.trim();
    if (isAvailable !== undefined) item.isAvailable = Boolean(isAvailable);
    if (imageUrl !== undefined) item.imageUrl = imageUrl.trim();

    await item.save();

    return res.status(200).json({
      success: true,
      message: 'Menu item updated successfully!',
      data: item,
    });
  } catch (error) {
    console.error('updateMenuItem error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update menu item.',
    });
  }
};

// @desc    Delete a menu item
// @route   DELETE /api/menu/:id
// @access  Private (Admin)
export const deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await MenuItem.findOneAndDelete({ _id: id, admin: req.admin._id });
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found or you are not authorized to delete it.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Menu item deleted successfully.',
    });
  } catch (error) {
    console.error('deleteMenuItem error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete menu item.',
    });
  }
};

// @desc    Public menu fetch for table guests who scanned QR code
// @route   GET /api/menu/public/:restaurantId
// @access  Public
export const getPublicMenu = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const admin = await Admin.findById(restaurantId).select('name restaurantName phone');
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found.',
      });
    }

    // Return only available items for guests
    const items = await MenuItem.find({ admin: restaurantId, isAvailable: true }).sort({ category: 1, name: 1 });

    return res.status(200).json({
      success: true,
      restaurant: {
        id: admin._id,
        name: admin.restaurantName,
        owner: admin.name,
      },
      data: items,
    });
  } catch (error) {
    console.error('getPublicMenu error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to load restaurant menu.',
    });
  }
};
