const express = require('express');
const router = express.Router();
const { 
  getUserProfile, 
  updateUserProfile, 
  updateUserPassword, 
  getUsers, 
  getUserById, 
  updateUserStatus 
} = require('../controllers/userController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

router.route('/password')
  .put(protect, updateUserPassword);

router.route('/')
  .get(admin, getUsers);

router.route('/:id')
  .get(admin, getUserById);

router.route('/:id/status')
  .patch(admin, updateUserStatus);

module.exports = router;
