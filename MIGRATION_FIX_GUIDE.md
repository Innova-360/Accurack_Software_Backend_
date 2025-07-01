# Migration Fix Guide

This guide explains how to handle and prevent the recurring migration issues in the Accurack Backend.

## 🚨 The Problem

The application was experiencing repeated foreign key constraint errors due to failed Prisma migrations that got stuck in an incomplete state. This caused the error:

```
ERROR: type "Role" already exists
ERROR: relation "..." already exists
```

## 🛠️ Quick Fix Solutions

### Option 1: Automated Fix Script (Recommended)

**For Windows:**

```bash
npm run fix:migrations:win
```

**For Linux/Mac:**

```bash
npm run fix:migrations
```

**Or run directly:**

```bash
# Windows
scripts\fix-migrations.bat

# Linux/Mac
./scripts/fix-migrations.sh
```

### Option 2: Manual Fix

1. **Check migration status:**

   ```bash
   npm run migration:status
   ```

2. **Clean failed migrations:**

   ```bash
   docker exec accurack_postgres_dev psql -U accurack_admin -d accurack_master -c "DELETE FROM _prisma_migrations WHERE finished_at IS NULL OR applied_steps_count = 0;"
   ```

3. **Resolve specific migration:**

   ```bash
   npx prisma migrate resolve --applied "20250630194620_"
   ```

4. **Generate Prisma client:**

   ```bash
   npm run prisma:generate
   ```

5. **Restart backend:**
   ```bash
   docker-compose -f docker-compose.dev.yml restart backend-dev
   ```

## 🔧 What the Fix Scripts Do

1. **Detection:** Automatically detect failed migrations
2. **Cleanup:** Remove incomplete migration records from `_prisma_migrations` table
3. **Resolution:** Mark problematic migrations as applied (since schema already exists)
4. **Verification:** Ensure all migrations are working correctly
5. **Restart:** Restart the backend service automatically

## 🚀 Prevention Measures

### 1. Updated Docker Entrypoint

The `docker-entrypoint.dev.sh` now includes automatic migration issue detection and resolution.

### 2. Available NPM Scripts

```bash
# Check migration status
npm run migration:status

# Fix migration issues automatically
npm run fix:migrations         # Linux/Mac
npm run fix:migrations:win     # Windows

# Reset migrations completely (nuclear option)
npm run migration:reset

# Standard Prisma commands
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### 3. Best Practices

- **Always check migration status** before making schema changes
- **Use the fix script** whenever you see migration errors
- **Don't manually edit migration files** after they've been applied
- **Use `prisma migrate dev`** for development changes
- **Use `prisma migrate deploy`** for production

## 🔍 Troubleshooting

### If the fix script doesn't work:

1. **Complete reset (nuclear option):**

   ```bash
   npm run migration:reset
   ```

2. **Manual database reset:**

   ```bash
   docker-compose -f docker-compose.dev.yml down -v
   docker-compose -f docker-compose.dev.yml up -d
   ```

3. **Check Docker logs:**
   ```bash
   npm run docker:dev:logs
   ```

### Common Error Messages and Solutions:

| Error                                      | Solution                        |
| ------------------------------------------ | ------------------------------- |
| `type "Role" already exists`               | Run fix script - enum conflict  |
| `relation "..." already exists`            | Run fix script - table conflict |
| `failed migrations in the target database` | Clean failed migrations         |
| `Migration ... failed`                     | Mark as applied or rolled back  |

## 📝 How It Works

### Migration States

Prisma tracks migrations in the `_prisma_migrations` table:

- `finished_at IS NULL` = Failed migration
- `applied_steps_count = 0` = Not properly applied

### The Fix Process

1. **Identify** failed migrations
2. **Clean** incomplete records
3. **Resolve** conflicts by marking as applied
4. **Verify** final state

## 🎯 Future Improvements

- [ ] Add migration health checks to CI/CD
- [ ] Implement automatic backup before migrations
- [ ] Add migration rollback capabilities
- [ ] Monitor migration performance

## 📞 Support

If you continue to experience migration issues after running the fix scripts:

1. Check the application logs
2. Run the fix script with verbose output
3. Consider a complete database reset for development
4. Contact the development team

---

**Remember:** These scripts are safe for development environments. For production, always backup your database before running any migration fixes.
