const express = require('express');
const router = express.Router();
const { 
  createOrder, 
  getMyOrders, 
  getMyOrderById, 
  getOrders, 
  getOrderById, 
  updateOrderStatus 
} = require('../controllers/orderController');
const { protect, admin } = require('../middleware/authMiddleware');

// User Routes
router.route('/').post(protect, createOrder);
router.route('/my-orders').get(protect, getMyOrders);
router.route('/my-orders/:id').get(protect, getMyOrderById);

// Admin Routes
router.route('/').get(admin, getOrders);
router.route('/:id').get(admin, getOrderById);
router.route('/:id/status').patch(admin, updateOrderStatus);

module.exports = router;
