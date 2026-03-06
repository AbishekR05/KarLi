const express = require('express');
const router = express.Router();
const { 
  getProducts, 
  getProductById, 
  getProductsByCategory, 
  createProduct, 
  updateProduct, 
  deleteProduct 
} = require('../controllers/productController');
const { admin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.route('/')
  .get(getProducts)
  .post(admin, upload.array('images', 5), createProduct);

router.route('/category/:cat').get(getProductsByCategory);

router.route('/:id')
  .get(getProductById)
  .put(admin, upload.array('images', 5), updateProduct)
  .delete(admin, deleteProduct);

module.exports = router;
