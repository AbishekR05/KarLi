const prisma = require('../prisma');
const bcrypt = require('bcryptjs');
const generateToken = require('../utils/generateToken');
const { validationResult } = require('express-validator');

// @desc    Register a new customer
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400);
      throw new Error(errors.array()[0].msg);
    }

    const { fullName, email, password, phone } = req.body;

    const userExists = await prisma.user.findUnique({ where: { email } });

    if (userExists) {
      res.status(400);
      throw new Error('User already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        passwordHash,
        phone,
        role: 'CUSTOMER',
      },
    });

    if (user) {
      res.status(201).json({
        success: true,
        data: {
          token: generateToken(user.id, user.role),
          user: {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            role: user.role.toLowerCase(),
          },
        },
      });
    } else {
      res.status(400);
      throw new Error('Invalid user data');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400);
      throw new Error(errors.array()[0].msg);
    }

    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    if (user && user.status === 'BLOCKED') {
      res.status(403);
      throw new Error('User account is blocked');
    }

    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      res.json({
        success: true,
        data: {
          token: generateToken(user.id, user.role.toLowerCase()),
          user: {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            role: user.role.toLowerCase(),
          },
        },
      });
    } else {
      res.status(401);
      throw new Error('Invalid email or password');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Auth admin & get token
// @route   POST /api/auth/admin-login
// @access  Public
const loginAdmin = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400);
      throw new Error(errors.array()[0].msg);
    }

    const { email, password } = req.body;

    const admin = await prisma.user.findUnique({ where: { email } });

    if (admin && admin.status === 'BLOCKED') {
      res.status(403);
      throw new Error('Admin account is blocked');
    }

    if (admin && admin.role === 'ADMIN' && (await bcrypt.compare(password, admin.passwordHash))) {
      res.json({
        success: true,
        data: {
          token: generateToken(admin.id, admin.role.toLowerCase()),
          user: {
            id: admin.id,
            fullName: admin.fullName,
            email: admin.email,
            role: admin.role.toLowerCase(),
          },
        },
      });
    } else {
      res.status(401);
      throw new Error('Invalid email or password or unauthorized');
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  loginAdmin,
};
