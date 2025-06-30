/**
 * Category Seeder for Prisma (Tenant DB)
 *
 * Usage:
 *   npx ts-node prisma/seed-category.ts --db-url="<TENANT_DATABASE_URL>"
 *
 * Example:
 *   npx ts-node prisma/seed-category.ts --db-url="postgresql://user:pass@localhost:5432/tenantdb"
 *
 * This script will upsert a standard set of product categories into the tenant database.
 */

import { PrismaClient } from '@prisma/client';

// Standard product categories with code (customize as needed)
const categories = [
  { name: 'Electronics', code: 'ELECTRONICS' },
  { name: 'Groceries', code: 'GROCERIES' },
  { name: 'Clothing', code: 'CLOTHING' },
  { name: 'Footwear', code: 'FOOTWEAR' },
  { name: 'Home Appliances', code: 'HOME_APPLIANCES' },
  { name: 'Furniture', code: 'FURNITURE' },
  { name: 'Toys', code: 'TOYS' },
  { name: 'Books', code: 'BOOKS' },
  { name: 'Stationery', code: 'STATIONERY' },
  { name: 'Sports', code: 'SPORTS' },
  { name: 'Beauty & Personal Care', code: 'BEAUTY_PERSONAL_CARE' },
  { name: 'Automotive', code: 'AUTOMOTIVE' },
  { name: 'Jewelry', code: 'JEWELRY' },
  { name: 'Garden & Outdoors', code: 'GARDEN_OUTDOORS' },
  { name: 'Pet Supplies', code: 'PET_SUPPLIES' },
  { name: 'Pharmacy', code: 'PHARMACY' },
  { name: 'Beverages', code: 'BEVERAGES' },
  { name: 'Bakery', code: 'BAKERY' },
  { name: 'Dairy', code: 'DAIRY' },
  { name: 'Meat & Seafood', code: 'MEAT_SEAFOOD' },
  { name: 'Baby Products', code: 'BABY_PRODUCTS' },
];

// Get DB URL from command line argument
const dbUrlArg = process.argv.find((arg) => arg.startsWith('--db-url='));
const dbUrl = dbUrlArg ? dbUrlArg.split('=')[1] : process.env.DATABASE_URL;

if (!dbUrl) {
  console.error(
    '❌ No database URL provided. Use --db-url or set DATABASE_URL.',
  );
  process.exit(1);
}

const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

async function main() {
  for (const { name, code } of categories) {
    await prisma.category.upsert({
      where: { code },
      update: { name },
      create: { name, code },
    });
    console.log(`✔️  Category upserted: ${name} (${code})`);
  }
  console.log('✅ Category seeding complete.');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding categories:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
