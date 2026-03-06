const prisma = require('../prisma');
const bcrypt = require('bcryptjs');

// @desc    Get logged in user profile
// @route   GET /api/users/profile
// @access  User
const getUserProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, fullName: true, email: true, phone: true, role: true, status: true, createdAt: true }
    });

    if (user) {
      res.json({ success: true, data: user });
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  User
const updateUserProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    if (user) {
      // Check if email is being changed and is already in use
      if (req.body.email && req.body.email !== user.email) {
        const emailExists = await prisma.user.findUnique({ where: { email: req.body.email } });
        if (emailExists) {
            res.status(400);
            throw new Error('Email is already taken');
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id: req.user.id },
        data: {
          fullName: req.body.fullName || user.fullName,
          email: req.body.email || user.email,
          phone: req.body.phone !== undefined ? req.body.phone : user.phone,
        },
        select: { id: true, fullName: true, email: true, phone: true, role: true, createdAt: true }
      });

      res.json({ success: true, data: updatedUser });
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Update password
// @route   PUT /api/users/password
// @access  User
const updateUserPassword = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    if (user && (await bcrypt.compare(req.body.currentPassword, user.passwordHash))) {
        if (req.body.newPassword && req.body.newPassword.length >= 8) {
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(req.body.newPassword, salt);
            
            await prisma.user.update({
                where: { id: req.user.id },
                data: { passwordHash }
            });

            res.json({ success: true, message: 'Password updated successfully' });
        } else {
            res.status(400);
            throw new Error('New password must be at least 8 characters');
        }
    } else {
      res.status(401);
      throw new Error('Invalid current password');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users (Admin)
// @route   GET /api/users
// @access  Admin
const getUsers = async (req, res, next) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;

    const query = { role: 'CUSTOMER' }; // typically admins just see customers, or all. We'll show all including admins.
    delete query.role;

    if (status) query.status = status;
    if (search) {
      query.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where: query,
        select: { id: true, fullName: true, email: true, phone: true, role: true, status: true, createdAt: true, _count: { select: { orders: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.user.count({ where: query })
    ]);

    const formattedUsers = users.map(u => ({
        ...u,
        totalOrders: u._count.orders,
        _count: undefined
    }));

    res.json({
      success: true,
      data: {
        users: formattedUsers,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Admin
const getUserById = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { 
          id: true, fullName: true, email: true, phone: true, role: true, status: true, createdAt: true,
          orders: { orderBy: { createdAt: 'desc' }, select: { id: true, totalAmount: true, status: true, createdAt: true } }
      }
    });

    if (user) {
      res.json({ success: true, data: user });
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Update user status
// @route   PATCH /api/users/:id/status
// @access  Admin
const updateUserStatus = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }
    
    // Prevent blocking an admin, depending on spec (spec says admin can't delete users, only block them. Didn't say can't block admin but probably best).
    if (user.role === 'ADMIN' && req.body.status === 'BLOCKED') {
        res.status(400);
        throw new Error('Cannot block an admin user');
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.params.id },
      data: { status: req.body.status },
      select: { id: true, status: true }
    });

    res.json({ success: true, message: 'User status updated', data: updatedUser });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  updateUserPassword,
  getUsers,
  getUserById,
  updateUserStatus,
};
