#!/usr/bin/env node

/**
 * Test script to verify tenant schema initialization
 * Run this script to test the multi-tenant database schema setup
 */

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function testSchemaInitialization() {
  console.log('🧪 Testing Tenant Schema Initialization...\n');

  try {
    // 1. Test Prisma CLI availability
    console.log('1. Checking Prisma CLI...');
    await execAsync('npx prisma --version');
    console.log('✅ Prisma CLI is available\n');

    // 2. Test schema generation
    console.log('2. Testing schema generation...');
    const { stdout } = await execAsync('npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script');
    
    if (stdout.trim()) {
      console.log('✅ Schema SQL generated successfully');
      console.log(`📊 Schema size: ${stdout.length} characters\n`);
    } else {
      console.log('⚠️ Empty schema generated - check your prisma/schema.prisma file\n');
    }

    // 3. Test database connection (requires running PostgreSQL)
    console.log('3. Testing database connection...');
    try {
      await execAsync('npx prisma db pull --preview-feature', { timeout: 5000 });
      console.log('✅ Database connection successful\n');
    } catch (dbError) {
      console.log('⚠️ Database connection failed (this is expected if PostgreSQL is not running)\n');
    }

    console.log('🎉 Schema initialization test completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Start PostgreSQL: docker-compose up -d');
    console.log('2. Test tenant creation via API');
    console.log('3. Verify schema is created in tenant database');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testSchemaInitialization();
