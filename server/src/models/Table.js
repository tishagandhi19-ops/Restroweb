import mongoose from 'mongoose';
import crypto from 'crypto';

const tableSchema = new mongoose.Schema(
  {
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
    tableNumber: {
      type: String,
      required: [true, 'Please provide a table number or name'],
      trim: true,
    },
    qrToken: {
      type: String,
      unique: true,
      sparse: true,
      default: () => crypto.randomBytes(12).toString('hex'),
      index: true,
    },
    capacity: {
      type: Number,
      default: 4,
      min: [1, 'Capacity must be at least 1 person'],
    },
    status: {
      type: String,
      enum: ['Available', 'Occupied', 'Reserved'],
      default: 'Available',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to guarantee uniqueness of table number per restaurant admin
tableSchema.index({ admin: 1, tableNumber: 1 }, { unique: true });

const Table = mongoose.model('Table', tableSchema);

export default Table;
