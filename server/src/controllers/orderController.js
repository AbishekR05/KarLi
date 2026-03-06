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

// @desc    Place a new order
// @route   POST /api/orders
// @access  User
const createOrder = async (req, res, next) => {
  try {
    const { items, shippingName, shippingAddress, shippingCity, shippingState, shippingPincode, shippingPhone, paymentMethod } = req.body;

    if (!items || items.length === 0) {
      res.status(400);
      throw new Error('No order items');
    }

    const orderItemsForCreate = [];
    let subtotal = 0;
    let totalDiscount = 0;
    let totalAmount = 0;

    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) {
        res.status(404);
        throw new Error(`Product not found with id: ${item.productId}`);
      }
      if (product.stockQuantity < item.quantity) {
        res.status(400);
        throw new Error(`Not enough stock for ${product.name}`);
      }

      const discountedPrice = calcDiscountedPrice(product);
      const unitPrice = product.price;

      subtotal += unitPrice * item.quantity;
      totalAmount += discountedPrice * item.quantity;
      
      let imageArr = [];
      try { imageArr = JSON.parse(product.images); } catch(e) {}
      const firstImage = imageArr.length > 0 ? imageArr[0] : '';

      orderItemsForCreate.push({
        productId: product.id,
        productName: product.name,
        productImage: firstImage,
        quantity: parseInt(item.quantity),
        unitPrice: unitPrice,
        discountedPrice: discountedPrice
      });
    }

    totalDiscount = subtotal - totalAmount;

    // Use transaction to ensure data integrity
    const order = await prisma.$transaction(async (prismaClient) => {
      // 1. Create the order
      const newOrder = await prismaClient.order.create({
        data: {
          userId: req.user.id,
          shippingName,
          shippingAddress,
          shippingCity,
          shippingState,
          shippingPincode,
          shippingPhone,
          paymentMethod: paymentMethod || 'COD',
          subtotal,
          totalDiscount,
          totalAmount,
          status: 'PENDING',
          items: {
            create: orderItemsForCreate
          },
          statusHistory: {
            create: [
              { status: 'PENDING', note: 'Order placed successfully' }
            ]
          }
        },
        include: {
          items: true
        }
      });

      // 2. Decrement stock
      for (const item of items) {
        await prismaClient.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { decrement: parseInt(item.quantity) } }
        });
      }

      return newOrder;
    });

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all orders for logged in user
// @route   GET /api/orders/my-orders
// @access  User
const getMyOrders = async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      include: { items: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
};

// @desc    Get order by ID (User)
// @route   GET /api/orders/my-orders/:id
// @access  User
const getMyOrderById = async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: true, statusHistory: { orderBy: { createdAt: 'desc' } } }
    });

    if (!order) {
      res.status(404);
      throw new Error('Order not found');
    }

    if (order.userId !== req.user.id) {
      res.status(403);
      throw new Error('Not authorized to view this order');
    }

    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all orders (Admin)
// @route   GET /api/orders
// @access  Admin
const getOrders = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (search) {
      query.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { user: { fullName: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [orders, total] = await prisma.$transaction([
      prisma.order.findMany({
        where: query,
        include: { user: { select: { fullName: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.order.count({ where: query })
    ]);

    const formattedOrders = orders.map(order => ({
        ...order,
        customerName: order.user.fullName,
        user: undefined // remove nested object
    }));

    res.json({
      success: true,
      data: {
        orders: formattedOrders,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get order by ID (Admin)
// @route   GET /api/orders/:id
// @access  Admin
const getOrderById = async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { 
        user: { select: { fullName: true, email: true, phone: true } },
        items: true, 
        statusHistory: { orderBy: { createdAt: 'desc' } } 
      }
    });

    if (!order) {
      res.status(404);
      throw new Error('Order not found');
    }

    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status
// @route   PATCH /api/orders/:id/status
// @access  Admin
const updateOrderStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;
    
    if (!status) {
        res.status(400);
        throw new Error('Please provide status');
    }

    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) {
      res.status(404);
      throw new Error('Order not found');
    }

    const updatedOrder = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        status,
        statusHistory: {
          create: {
            status,
            note: note || undefined
          }
        }
      },
      include: {
        statusHistory: { orderBy: { createdAt: 'desc' } }
      }
    });

    res.json({ success: true, data: updatedOrder });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getMyOrderById,
  getOrders,
  getOrderById,
  updateOrderStatus
};
