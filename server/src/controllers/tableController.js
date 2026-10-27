import Table from '../models/Table.js';

// @desc    Get all tables for logged-in admin
// @route   GET /api/tables
// @access  Private (Admin)
export const getTables = async (req, res) => {
  try {
    const tables = await Table.find({ admin: req.admin._id }).sort({ createdAt: 1 });
    return res.status(200).json({
      success: true,
      count: tables.length,
      data: tables,
    });
  } catch (error) {
    console.error('getTables error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch restaurant tables.',
    });
  }
};

// @desc    Create a single table
// @route   POST /api/tables
// @access  Private (Admin)
export const createTable = async (req, res) => {
  try {
    const { tableNumber, capacity, status } = req.body;

    if (!tableNumber) {
      return res.status(400).json({
        success: false,
        message: 'Table number or identifier is required.',
      });
    }

    // Check if table already exists for this restaurant
    const exists = await Table.findOne({
      admin: req.admin._id,
      tableNumber: tableNumber.trim(),
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: `Table "${tableNumber.trim()}" already exists. Please choose a different number or label.`,
      });
    }

    const table = await Table.create({
      admin: req.admin._id,
      tableNumber: tableNumber.trim(),
      capacity: capacity ? Number(capacity) : 4,
      status: status || 'Available',
    });

    return res.status(201).json({
      success: true,
      message: `Table ${table.tableNumber} created successfully!`,
      data: table,
    });
  } catch (error) {
    console.error('createTable error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create table.',
    });
  }
};

// @desc    Bulk create tables (e.g. Table 1 through Table N)
// @route   POST /api/tables/bulk
// @access  Private (Admin)
export const createBulkTables = async (req, res) => {
  try {
    const { start = 1, count = 5, capacity = 4, prefix = 'Table ' } = req.body;

    const startNum = Math.max(1, parseInt(start, 10));
    const totalCount = Math.min(50, Math.max(1, parseInt(count, 10)));
    const capNum = Math.max(1, parseInt(capacity, 10));

    const existingTables = await Table.find({ admin: req.admin._id });
    const existingSet = new Set(existingTables.map((t) => t.tableNumber.toLowerCase()));

    const newTablesToInsert = [];
    for (let i = 0; i < totalCount; i++) {
      const num = startNum + i;
      const label = `${prefix.trim() ? prefix.trim() + ' ' : ''}${num}`.trim();

      if (!existingSet.has(label.toLowerCase())) {
        newTablesToInsert.push({
          admin: req.admin._id,
          tableNumber: label,
          capacity: capNum,
          status: 'Available',
        });
      }
    }

    if (newTablesToInsert.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'All specified table numbers already exist.',
      });
    }

    const inserted = await Table.insertMany(newTablesToInsert);

    return res.status(201).json({
      success: true,
      message: `Successfully generated ${inserted.length} tables!`,
      data: inserted,
    });
  } catch (error) {
    console.error('createBulkTables error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to bulk generate tables.',
    });
  }
};

// @desc    Update a table
// @route   PUT /api/tables/:id
// @access  Private (Admin)
export const updateTable = async (req, res) => {
  try {
    const { id } = req.params;
    const { tableNumber, capacity, status } = req.body;

    const table = await Table.findOne({ _id: id, admin: req.admin._id });
    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Table not found or not authorized.',
      });
    }

    if (tableNumber !== undefined && tableNumber.trim() !== table.tableNumber) {
      const duplicate = await Table.findOne({
        admin: req.admin._id,
        tableNumber: tableNumber.trim(),
        _id: { $ne: id },
      });
      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: `Table "${tableNumber.trim()}" already exists.`,
        });
      }
      table.tableNumber = tableNumber.trim();
    }

    if (capacity !== undefined) table.capacity = Number(capacity);
    if (status !== undefined) table.status = status;

    await table.save();

    return res.status(200).json({
      success: true,
      message: 'Table updated successfully!',
      data: table,
    });
  } catch (error) {
    console.error('updateTable error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update table.',
    });
  }
};

// @desc    Delete a table
// @route   DELETE /api/tables/:id
// @access  Private (Admin)
export const deleteTable = async (req, res) => {
  try {
    const { id } = req.params;

    const table = await Table.findOneAndDelete({ _id: id, admin: req.admin._id });
    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Table not found or not authorized to delete.',
      });
    }

    return res.status(200).json({
      success: true,
      message: `Table ${table.tableNumber} deleted successfully.`,
    });
  } catch (error) {
    console.error('deleteTable error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete table.',
    });
  }
};
