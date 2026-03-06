const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // 1. Users
  const adminPassword = await bcrypt.hash('Admin@1234', 10);
  const userPassword = await bcrypt.hash('User@1234', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@karlifashion.com' },
    update: {},
    create: {
      fullName: 'System Admin',
      email: 'admin@karlifashion.com',
      passwordHash: adminPassword,
      role: 'ADMIN',
    },
  });
  console.log(`Upserted admin user: ${admin.email}`);

  const testUser = await prisma.user.upsert({
    where: { email: 'testuser@karlifashion.com' },
    update: {},
    create: {
      fullName: 'Test Customer',
      email: 'testuser@karlifashion.com',
      passwordHash: userPassword,
      role: 'CUSTOMER',
      phone: '9876543210'
    },
  });
  console.log(`Upserted test customer: ${testUser.email}`);

  // 2. Products
  const sampleProducts = [
    {
      name: 'Eternity Gold Ring',
      description: 'A beautiful 24k gold ring symbolizing eternal love. Features a minimalist design perfect for daily wear or special occasions.',
      category: 'RINGS',
      material: 'Gold',
      price: 15000,
      stockQuantity: 20,
      weightGrams: 4.5,
      images: JSON.stringify([]),
    },
    {
      name: 'Diamond Solitaire Necklace',
      description: 'Stunning solitaire diamond pendant set in 18k white gold. The delicate chain adds a touch of modern elegance.',
      category: 'NECKLACES',
      material: 'Platinum',
      price: 45000,
      stockQuantity: 10,
      weightGrams: 8.2,
      images: JSON.stringify([]),
      discountEnabled: true,
      discountType: 'PERCENTAGE',
      discountValue: 10,
      discountStart: new Date(new Date().setDate(new Date().getDate() - 1)), // Yesterday
      discountEnd: new Date(new Date().setDate(new Date().getDate() + 30)), // +30 days
    },
    {
      name: 'Rose Gold Floral Earrings',
      description: 'Intricately designed floral earrings crafted in 14k rose gold. Lightweight and perfect for festive wear.',
      category: 'EARRINGS',
      material: 'Rose Gold',
      price: 12500,
      stockQuantity: 15,
      weightGrams: 5.0,
      images: JSON.stringify([]),
    },
    {
      name: 'Classic Silver Bracelet',
      description: 'Solid sterling silver link bracelet with a secure clasp. A versatile piece that complements any outfit.',
      category: 'BRACELETS',
      material: 'Silver',
      price: 4500,
      stockQuantity: 30,
      weightGrams: 12.0,
      images: JSON.stringify([]),
      discountEnabled: true,
      discountType: 'FLAT',
      discountValue: 500,
      discountStart: new Date(new Date().setDate(new Date().getDate() - 1)),
      discountEnd: new Date(new Date().setDate(new Date().getDate() + 7)),
    },
    {
      name: 'Traditional Gold Bangles Set',
      description: 'Set of two intricately textured 22k gold bangles. A staple for traditional Indian weddings and ceremonies.',
      category: 'BANGLES',
      material: 'Gold',
      price: 85000,
      stockQuantity: 5,
      weightGrams: 30.0,
      images: JSON.stringify([]),
    },
    {
      name: 'Designer Gold Nose Ring',
      description: 'Elegant designer nose ring with a delicate chain. Perfect for adding a touch of traditional glamour to ethnic wear.',
      category: 'OTHER',
      material: 'Gold',
      price: 3500,
      stockQuantity: 40,
      weightGrams: 1.5,
      images: JSON.stringify([]),
    }
  ];

  for (const p of sampleProducts) {
    // Delete existing by name if needed, or simply insert. We'll findFirst and update, or create
    const existing = await prisma.product.findFirst({ where: { name: p.name } });
    if (existing) {
        await prisma.product.update({ where: { id: existing.id }, data: p });
        console.log(`Updated product: ${p.name}`);
    } else {
        await prisma.product.create({ data: p });
        console.log(`Created product: ${p.name}`);
    }
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
