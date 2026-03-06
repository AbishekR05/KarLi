const prisma = require('../prisma');
const fs = require('fs');
const path = require('path');

const calcDiscountedPrice = (product) => {
  if (!product.discountEnabled || !product.discountStart || !product.discountEnd) return product.price;
  
  const today = new Date();
  const start = new Date(product.discountStart);
  const end = new Date(product.discountEnd);
  
  const isActive = start <= today && end >= today;
  if (!isActive) return product.price;

  if (product.discountType === 'PERCENTAGE') {
    const saving = (product.price * product.discountValue) / 100;
    return Math.max(0, product.price - saving);
  }
  if (product.discountType === 'FLAT') {
    return Math.max(0, product.price - product.discountValue);
  }
  return product.price;
};

// @desc    Get all active products
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res, next) => {
  try {
    const { 
      search, category, minPrice, maxPrice, material, sort, page = 1, limit = 12 
    } = req.query;

    const query = { status: 'ACTIVE' };

    if (search) {
      query.name = { contains: search, mode: 'insensitive' };
    }
    if (category) {
      query.category = category.toUpperCase();
    }
    if (material) {
      query.material = { equals: material, mode: 'insensitive' };
    }
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.gte = parseFloat(minPrice);
      if (maxPrice) query.price.lte = parseFloat(maxPrice);
    }

    let orderBy = { createdAt: 'desc' }; // default 'newest'
    if (sort === 'price_asc') orderBy = { price: 'asc' };
    else if (sort === 'price_desc') orderBy = { price: 'desc' };
    else if (sort === 'popular') orderBy = { orderItems: { _count: 'desc' } };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [productsRaw, total] = await prisma.$transaction([
      prisma.product.findMany({
        where: query,
        orderBy,
        skip,
        take,
      }),
      prisma.product.count({ where: query }),
    ]);

    const products = productsRaw.map((p) => ({
      ...p,
      discountedPrice: calcDiscountedPrice(p),
    }));

    res.json({
      success: true,
      data: {
        products,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single product by ID
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
    });

    if (product) {
      res.json({
        success: true,
        data: {
          ...product,
          discountedPrice: calcDiscountedPrice(product),
        },
      });
    } else {
      res.status(404);
      throw new Error('Product not found');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get products by category
// @route   GET /api/products/category/:cat
// @access  Public
const getProductsByCategory = async (req, res, next) => {
  try {
    const productsRaw = await prisma.product.findMany({
      where: { category: req.params.cat.toUpperCase(), status: 'ACTIVE' },
    });

    const products = productsRaw.map((p) => ({
      ...p,
      discountedPrice: calcDiscountedPrice(p),
    }));

    res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new product
// @route   POST /api/products
// @access  Admin
const createProduct = async (req, res, next) => {
  try {
    const files = req.files;
    const body = req.body;

    const images = files ? files.map((file) => file.path.replace(/\\/g, '/')) : [];

    const product = await prisma.product.create({
      data: {
        name: body.name,
        description: body.description,
        category: body.category.toUpperCase(),
        material: body.material,
        price: parseFloat(body.price),
        stockQuantity: parseInt(body.stockQuantity),
        weightGrams: body.weightGrams ? parseFloat(body.weightGrams) : null,
        status: body.status || 'ACTIVE',
        discountEnabled: body.discountEnabled === 'true' || body.discountEnabled === true,
        discountType: body.discountType || null,
        discountValue: body.discountValue ? parseFloat(body.discountValue) : null,
        discountStart: body.discountStart ? new Date(body.discountStart) : null,
        discountEnd: body.discountEnd ? new Date(body.discountEnd) : null,
        images: JSON.stringify(images),
      },
    });

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// @desc    Update an existing product
// @route   PUT /api/products/:id
// @access  Admin
const updateProduct = async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }

    const files = req.files;
    const body = req.body;

    let imagesJson = product.images;
    if (files && files.length > 0) {
      const images = files.map((file) => file.path.replace(/\\/g, '/'));
      imagesJson = JSON.stringify(images);
      
      // Optionally delete old images here if we wanted to
      try {
          const oldImages = JSON.parse(product.images);
          oldImages.forEach((img) => {
              if (fs.existsSync(img)) fs.unlinkSync(img);
          });
      } catch(e) { }
    }

    const updatedProduct = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        name: body.name || product.name,
        description: body.description || product.description,
        category: body.category ? body.category.toUpperCase() : product.category,
        material: body.material || product.material,
        price: body.price ? parseFloat(body.price) : product.price,
        stockQuantity: body.stockQuantity ? parseInt(body.stockQuantity) : product.stockQuantity,
        weightGrams: body.weightGrams ? parseFloat(body.weightGrams) : product.weightGrams,
        status: body.status || product.status,
        discountEnabled: typeof body.discountEnabled !== 'undefined' ? (body.discountEnabled === 'true' || body.discountEnabled === true) : product.discountEnabled,
        discountType: body.discountType !== undefined ? body.discountType : product.discountType,
        discountValue: body.discountValue ? parseFloat(body.discountValue) : product.discountValue,
        discountStart: body.discountStart ? new Date(body.discountStart) : product.discountStart,
        discountEnd: body.discountEnd ? new Date(body.discountEnd) : product.discountEnd,
        images: imagesJson,
      },
    });

    res.json({ success: true, data: updatedProduct });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Admin
const deleteProduct = async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }

    // Attempt to delete images
    try {
      const oldImages = JSON.parse(product.images);
      oldImages.forEach((img) => {
          if (fs.existsSync(img)) fs.unlinkSync(img);
      });
    } catch(e) { }

    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProductById,
  getProductsByCategory,
  createProduct,
  updateProduct,
  deleteProduct,
};
