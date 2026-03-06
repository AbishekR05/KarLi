const prisma = require('../prisma');

// Custom discount calculator helper identical to products
const calcDiscountedPrice = (product) => {
  if (!product.discountEnabled || !product.discountStart || !product.discountEnd) return product.price;
  const today = new Date();
  const start = new Date(product.discountStart);
  const end = new Date(product.discountEnd);
  if (!(start <= today && end >= today)) return product.price;
  if (product.discountType === 'PERCENTAGE') return Math.max(0, product.price - (product.price * product.discountValue) / 100);
  if (product.discountType === 'FLAT') return Math.max(0, product.price - product.discountValue);
  return product.price;
};

// @desc    Get user wishlist
// @route   GET /api/wishlist
// @access  User
const getWishlist = async (req, res, next) => {
  try {
    const listRaw = await prisma.wishlist.findMany({
      where: { userId: req.user.id },
      include: { product: true },
      orderBy: { createdAt: 'desc' }
    });

    const list = listRaw.map(item => ({
        id: item.id,
        product: {
            ...item.product,
            discountedPrice: calcDiscountedPrice(item.product)
        }
    }));

    res.json({ success: true, data: list });
  } catch (error) {
    next(error);
  }
};

// @desc    Add product to wishlist
// @route   POST /api/wishlist
// @access  User
const addToWishlist = async (req, res, next) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      res.status(400);
      throw new Error('Please provide a productId');
    }

    const productExists = await prisma.product.findUnique({ where: { id: productId } });
    if (!productExists) {
        res.status(404);
        throw new Error('Product not found');
    }

    const alreadyAdded = await prisma.wishlist.findFirst({
        where: { userId: req.user.id, productId }
    });

    if (alreadyAdded) {
        res.status(400);
        throw new Error('Product already in wishlist');
    }

    const wishlistItem = await prisma.wishlist.create({
        data: {
            userId: req.user.id,
            productId
        }
    });

    res.status(201).json({ 
        success: true, 
        message: 'Added to wishlist', 
        data: wishlistItem 
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove product from wishlist
// @route   DELETE /api/wishlist/:productId
// @access  User
const removeFromWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const wishlistItem = await prisma.wishlist.findFirst({
        where: { userId: req.user.id, productId }
    });

    if (!wishlistItem) {
        res.status(404);
        throw new Error('Product not found in wishlist');
    }

    await prisma.wishlist.delete({ where: { id: wishlistItem.id } });

    res.json({ success: true, message: 'Removed from wishlist' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist
};
