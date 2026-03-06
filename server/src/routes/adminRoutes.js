const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('../controllers/adminController');
const { admin } = require('../middleware/authMiddleware');

router.route('/dashboard').get(admin, getDashboardStats);

module.exports = router;
