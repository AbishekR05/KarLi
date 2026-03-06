const jwt = require('jsonwebtoken');
const prisma = require('../prisma');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      req.user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, fullName: true, email: true, role: true, status: true },
      });

      if (!req.user || req.user.status === 'BLOCKED') {
        res.status(401);
        throw new Error('Not authorized, user blocked or not found');
      }

      next();
    } catch (error) {
      res.status(401);
      next(new Error('Not authorized, token failed'));
    }
  } else {
      res.status(401);
      next(new Error('Not authorized, no token'));
  }
};

const admin = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_ADMIN_SECRET);
      
      req.user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, fullName: true, email: true, role: true, status: true },
      });

      if (!req.user || req.user.status === 'BLOCKED' || req.user.role !== 'ADMIN') {
        res.status(403);
        throw new Error('Not authorized as an admin');
      }

      next();
    } catch (error) {
      res.status(401);
      next(new Error('Not authorized, admin token failed'));
    }
  } else {
      res.status(401);
      next(new Error('Not authorized, no token'));
  }
};

module.exports = { protect, admin };
