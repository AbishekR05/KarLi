const prisma = require('../prisma');

// @desc    Get dashboard summary data
// @route   GET /api/admin/dashboard
// @access  Admin
const getDashboardStats = async (req, res, next) => {
  try {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [totalProducts, totalOrders, totalUsers, revenueAgg, recentOrdersRaw, lowStockProducts] = await prisma.$transaction([
      prisma.product.count(),
      prisma.order.count(),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      
      // Calculate revenue this month
      prisma.order.aggregate({
        where: {
          createdAt: {
            gte: firstDayOfMonth,
          },
          status: {
            not: 'CANCELLED' // assuming cancelled orders don't count towards revenue
          }
        },
        _sum: {
          totalAmount: true
        }
      }),

      // Recent 10 orders
      prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { fullName: true } } }
      }),

      // Low stock products (<= 5)
      prisma.product.findMany({
        where: { stockQuantity: { lte: 5 } },
        select: { id: true, name: true, stockQuantity: true },
        take: 20 // limit so payload isn't massive if they have 500 low stock items
      })
    ]);

    const recentOrders = recentOrdersRaw.map(o => ({
        id: o.id,
        customerName: o.user.fullName,
        totalAmount: o.totalAmount,
        status: o.status,
        createdAt: o.createdAt
    }));

    res.json({
      success: true,
      data: {
        totalProducts,
        totalOrders,
        totalUsers,
        revenueThisMonth: revenueAgg._sum.totalAmount || 0,
        recentOrders,
        lowStockProducts
      }
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats
};
