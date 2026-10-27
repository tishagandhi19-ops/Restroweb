import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';

// Helper to generate JWT Token
const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'restoweb_super_secret_jwt_key_2026_secure',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );
};

// @desc    Register a new admin
// @route   POST /api/auth/register
// @access  Public
export const registerAdmin = async (req, res) => {
  try {
    const { name, email, password, restaurantName, phone } = req.body;

    // Validate required fields
    if (!name || !email || !password || !restaurantName) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, email, password, and restaurant name.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    // Check if email already registered
    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists. Please log in.',
      });
    }

    // Create admin
    const admin = await Admin.create({
      name,
      email: email.toLowerCase(),
      password,
      restaurantName,
      phone: phone || '',
    });

    const token = generateToken(admin._id);

    return res.status(201).json({
      success: true,
      message: 'Admin account registered successfully!',
      data: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        restaurantName: admin.restaurantName,
        phone: admin.phone,
        token,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error occurred during registration.',
    });
  }
};

// @desc    Authenticate admin & get token
// @route   POST /api/auth/login
// @access  Public
export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
    }

    // Find admin by email
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password. Please check your credentials.',
      });
    }

    // Verify password
    const isMatch = await admin.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password. Please check your credentials.',
      });
    }

    const token = generateToken(admin._id);

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully!',
      data: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        restaurantName: admin.restaurantName,
        phone: admin.phone,
        token,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error occurred during login.',
    });
  }
};

// @desc    Get logged in admin profile
// @route   GET /api/auth/me
// @access  Private
export const getAdminProfile = async (req, res) => {
  try {
    if (!req.admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin profile not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: req.admin,
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error occurred while fetching profile.',
    });
  }
};
