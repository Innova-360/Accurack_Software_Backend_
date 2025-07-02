import { Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class MultiTenantService {
  private readonly logger = new Logger(MultiTenantService.name);
  private masterPool: Pool;
  private tenantPools = new Map<string, Pool>();
  constructor() {
    this.masterPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432') || 5432,
      user: process.env.DB_USER || 'accurack_admin',
      password: process.env.DB_PASSWORD || 'secure_password',
      database: process.env.DB_NAME || 'accurack_master',
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      ssl:
        process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : false,
    });

    // Initialize master database on startup
    this.initializeMasterDatabase().catch((error) => {
      this.logger.error(
        'Failed to initialize master database on startup:',
        error,
      );
    });
  }
  async createTenantDatabase(
    tenantId: string,
    clientData?: any,
    userData?: any,
  ): Promise<string> {
    const databaseName = `client_${tenantId}_db`;
    const userName = `user_${tenantId}`;
    const password = this.generateSecurePassword();

    try {
      // Create database
      await this.masterPool.query(`CREATE DATABASE "${databaseName}"`);
      this.logger.log(`Database ${databaseName} created successfully`);
      await this.masterPool.query(`
        CREATE USER "${userName}" WITH PASSWORD '${password}';
        GRANT ALL PRIVILEGES ON DATABASE "${databaseName}" TO "${userName}";
        ALTER USER "${userName}" CREATEDB;
      `); // Connect to the new database as master admin to grant schema privileges
      // Note: Master admin can connect to any database on the server to set up permissions
      const tempPool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER || 'accurack_admin', // Master admin user
        password: process.env.DB_PASSWORD || 'secure_password', // Master admin password
        database: databaseName, // New tenant database
        max: 2,
        ssl:
          process.env.NODE_ENV === 'production'
            ? { rejectUnauthorized: false }
            : false,
      });

      try {
        // Grant all privileges on public schema
        await tempPool.query(`
          GRANT ALL ON SCHEMA public TO "${userName}";
          GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "${userName}";
          GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "${userName}";
          ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "${userName}";
          ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "${userName}";
          ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO "${userName}";
        `);
      } finally {
        await tempPool.end();
      }
      this.logger.log(`User ${userName} created for database ${databaseName}`);

      // Store tenant credentials securely (in production, use proper secret management)
      await this.storeTenantCredentials(tenantId, {
        databaseName,
        userName,
        password,
      }); // Initialize schema for the new tenant database
      await this.initializeTenantSchema(databaseName, userName, password); // Insert client record into tenant database if provided
      if (clientData) {
        await this.insertClientRecord(
          databaseName,
          userName,
          password,
          clientData,
        );
      }

      // Insert user record into tenant database if provided
      if (userData) {
        await this.insertUserRecord(databaseName, userName, password, userData);
      }

      return databaseName;
    } catch (error) {
      this.logger.error(`Failed to create tenant database: ${error.message}`);

      // Cleanup on failure
      try {
        await this.masterPool.query(
          `DROP DATABASE IF EXISTS "${databaseName}"`,
        );
        await this.masterPool.query(`DROP USER IF EXISTS "${userName}"`);
        await this.removeTenantCredentials(tenantId);
      } catch (cleanupError) {
        this.logger.error(
          `Failed to cleanup after database creation failure: ${cleanupError.message}`,
        );
      }

      throw error;
    }
  }
  /**
   * Initialize schema for a new tenant database using Prisma
   */
  private async initializeTenantSchema(
    databaseName: string,
    userName: string,
    password: string,
  ): Promise<void> {
    try {
      this.logger.log(`Initializing schema for database: ${databaseName}`);

      // Create DATABASE_URL for the new tenant
      let tenantDatabaseUrl = `postgresql://${userName}:${password}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${databaseName}`;
      if (process.env.NODE_ENV === 'production') {
        tenantDatabaseUrl += '?sslmode=require';
      }

      // Try Method 1: Use Prisma CLI
      try {
        await this.runPrismaMigrations(tenantDatabaseUrl);
        this.logger.log(
          `Schema initialized successfully using Prisma for database: ${databaseName}`,
        );
        return;
      } catch (prismaError) {
        this.logger.warn(`Prisma method failed: ${prismaError.message}`);
        this.logger.log(
          'Attempting fallback method with direct SQL execution...',
        );
      }

      // Method 2: Fallback - Direct SQL execution
      await this.executeSchemaSQL(databaseName, userName, password);
      this.logger.log(
        `Schema initialized successfully using SQL fallback for database: ${databaseName}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to initialize schema for ${databaseName}: ${error.message}`,
      );
      throw error;
    }
  }
  /**
   * Run Prisma migrations on the tenant database
   */
  private async runPrismaMigrations(databaseUrl: string): Promise<void> {
    try {
      // Set the DATABASE_URL environment variable for this operation
      const env = { ...process.env, DATABASE_URL: databaseUrl };

      // First, try to connect to the database to ensure it's accessible
      const testPool = new Pool({
        connectionString: databaseUrl,
        max: 1,
        ssl:
          process.env.NODE_ENV === 'production'
            ? { rejectUnauthorized: false }
            : false,
      });

      try {
        const client = await testPool.connect();
        client.release();
      } catch (connectError) {
        this.logger.error(
          `Cannot connect to tenant database: ${connectError.message}`,
        );
        throw new Error(`Database connection failed: ${connectError.message}`);
      } finally {
        await testPool.end();
      }

      // Run Prisma db push to apply schema (without force-reset to avoid permission issues)
      const { stdout, stderr } = await execAsync(
        'npx prisma db push --skip-generate',
        {
          env,
          cwd: process.cwd(),
          timeout: 60000, // 60 seconds timeout
        },
      );

      if (stderr && !stderr.includes('warnings') && !stderr.includes('info')) {
        this.logger.warn(`Prisma migration warnings: ${stderr}`);
      }

      this.logger.log(`Prisma schema applied successfully`);
    } catch (error) {
      this.logger.error(`Prisma migration failed: ${error.message}`);

      // Try the fallback method
      this.logger.log('Attempting fallback schema initialization...');
      throw new Error(`Failed to apply schema: ${error.message}`);
    }
  }

  /**
   * Alternative method: Execute schema SQL directly
   * Use this if Prisma CLI approach doesn't work
   */
  private async executeSchemaSQL(
    databaseName: string,
    userName: string,
    password: string,
  ): Promise<void> {
    let tenantPool: Pool | null = null;

    try {
      // Create connection to the new tenant database
      tenantPool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: userName,
        password: password,
        database: databaseName,
        max: 2, // Small pool for schema creation
        ssl:
          process.env.NODE_ENV === 'production'
            ? { rejectUnauthorized: false }
            : false,
      }); // Generate schema SQL from Prisma
      const { stdout: schemaSql } = await execAsync(
        'npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script',
      );

      if (schemaSql.trim()) {
        this.logger.log('Executing schema SQL...');

        // Test connection first
        const client = await tenantPool.connect();

        try {
          // Split SQL into individual statements to handle them separately
          const statements = schemaSql
            .split(';')
            .map((stmt) => stmt.trim())
            .filter((stmt) => stmt.length > 0);

          for (const statement of statements) {
            if (statement.trim()) {
              try {
                await client.query(statement + ';');
              } catch (stmtError) {
                this.logger.warn(
                  `Statement failed (may be expected): ${stmtError.message}`,
                );
                // Continue with other statements
              }
            }
          }

          this.logger.log(
            `Schema SQL executed successfully for ${databaseName}`,
          );
        } finally {
          client.release();
        }
      } else {
        throw new Error('Empty schema SQL generated from Prisma');
      }
    } catch (error) {
      this.logger.error(`Failed to execute schema SQL: ${error.message}`);
      throw error;
    } finally {
      if (tenantPool) {
        await tenantPool.end();
      }
    }
  }

  async getTenantConnection(tenantId: string): Promise<Pool> {
    if (!this.tenantPools.has(tenantId)) {
      await this.createTenantPool(tenantId);
    }
    return this.tenantPools.get(tenantId) as Pool;
  }

  private async createTenantPool(tenantId: string): Promise<void> {
    const credentials = await this.getTenantCredentials(tenantId);

    if (!credentials) {
      throw new Error(`Tenant credentials not found for ${tenantId}`);
    }

    const pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432') || 5432,
      user: credentials.userName,
      password: credentials.password,
      database: credentials.databaseName,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      ssl:
        process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : false,
    });

    pool.on('error', (err) => {
      this.logger.error(`Database pool error for tenant ${tenantId}:`, err);
    });

    this.tenantPools.set(tenantId, pool);
  }

  async checkTenantDatabaseStatus(tenantId: string): Promise<{
    status: 'connected' | 'disconnected' | 'error';
    databaseSize?: string;
    connectionCount?: number;
  }> {
    try {
      const pool = await this.getTenantConnection(tenantId);
      const client = await pool.connect();

      // Check database size
      const sizeResult = await client.query(`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `);

      // Check connection count
      const connectionResult = await client.query(`
        SELECT count(*) as connections FROM pg_stat_activity 
        WHERE datname = current_database()
      `);

      client.release();

      return {
        status: 'connected',
        databaseSize: sizeResult.rows[0]?.size,
        connectionCount: parseInt(connectionResult.rows[0]?.connections || '0'),
      };
    } catch (error) {
      this.logger.error(
        `Failed to check tenant database status: ${error.message}`,
      );
      return { status: 'error' };
    }
  }

  async deleteTenantDatabase(tenantId: string): Promise<void> {
    const databaseName = `client_${tenantId}_db`;
    const userName = `user_${tenantId}`;

    try {
      // Close tenant pool if exists
      if (this.tenantPools.has(tenantId)) {
        const pool = this.tenantPools.get(tenantId);
        if (pool) {
          await pool.end();
        }
        this.tenantPools.delete(tenantId);
      }

      // Terminate active connections
      await this.masterPool.query(`
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = '${databaseName}' AND pid <> pg_backend_pid()
      `);

      // Drop database and user
      await this.masterPool.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
      await this.masterPool.query(`DROP USER IF EXISTS "${userName}"`);

      // Remove stored credentials
      await this.removeTenantCredentials(tenantId);

      this.logger.log(`Tenant database ${databaseName} deleted successfully`);
    } catch (error) {
      this.logger.error(`Failed to delete tenant database: ${error.message}`);
      throw error;
    }
  }

  private generateSecurePassword(): string {
    return (
      uuidv4().replace(/-/g, '') + Math.random().toString(36).substring(2, 15)
    );
  }
  private async storeTenantCredentials(
    tenantId: string,
    credentials: any,
  ): Promise<void> {
    try {
      // Ensure the table exists before inserting
      await this.initializeMasterDatabase();

      // In production, store in secure vault (AWS Secrets Manager, Azure Key Vault, etc.)
      // For now, store in master database
      await this.masterPool.query(
        `
        INSERT INTO tenant_credentials (tenant_id, database_name, username, password, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (tenant_id) DO UPDATE SET
          database_name = EXCLUDED.database_name,
          username = EXCLUDED.username,
          password = EXCLUDED.password,
          updated_at = NOW()
      `,
        [
          tenantId,
          credentials.databaseName,
          credentials.userName,
          credentials.password,
        ],
      );
    } catch (error) {
      this.logger.error(`Failed to store tenant credentials: ${error.message}`);
      throw error;
    }
  }
  private async getTenantCredentials(tenantId: string): Promise<any> {
    const result = await this.masterPool.query(
      `
      SELECT database_name, username, password
      FROM tenant_credentials
      WHERE tenant_id = $1
    `,
      [tenantId],
    );

    const row = result.rows[0];
    return row
      ? {
          databaseName: row.database_name,
          userName: row.username,
          password: row.password,
        }
      : null;
  }

  private async removeTenantCredentials(tenantId: string): Promise<void> {
    await this.masterPool.query(
      `
      DELETE FROM tenant_credentials WHERE tenant_id = $1
    `,
      [tenantId],
    );
  }
  async initializeMasterDatabase(): Promise<void> {
    try {
      // Check if table already exists to avoid unnecessary operations
      const tableCheck = await this.masterPool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'tenant_credentials'
        );
      `);

      if (!tableCheck.rows[0].exists) {
        await this.masterPool.query(`
          CREATE TABLE tenant_credentials (
            tenant_id UUID PRIMARY KEY,
            database_name VARCHAR(255) NOT NULL,
            username VARCHAR(255) NOT NULL,
            password VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          )
        `);
        this.logger.log(
          'Master database initialized successfully - tenant_credentials table created',
        );
      } else {
        this.logger.log(
          'Master database already initialized - tenant_credentials table exists',
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to initialize master database: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Verify that tenant database has proper schema
   */
  async verifyTenantSchema(tenantId: string): Promise<{
    hasSchema: boolean;
    tableCount: number;
    tables: string[];
  }> {
    try {
      const pool = await this.getTenantConnection(tenantId);
      const client = await pool.connect();

      // Check for tables in the database
      const result = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);

      client.release();

      const tables = result.rows.map((row) => row.table_name);

      return {
        hasSchema: tables.length > 0,
        tableCount: tables.length,
        tables: tables,
      };
    } catch (error) {
      this.logger.error(`Failed to verify tenant schema: ${error.message}`);
      return {
        hasSchema: false,
        tableCount: 0,
        tables: [],
      };
    }
  }

  /**
   * Test method to verify tenant user permissions
   */
  async testTenantPermissions(tenantId: string): Promise<{
    canCreateTables: boolean;
    canCreateEnums: boolean;
    schemaPrivileges: string[];
    error?: string;
  }> {
    try {
      const pool = await this.getTenantConnection(tenantId);
      const client = await pool.connect();

      try {
        // Test table creation
        let canCreateTables = false;
        try {
          await client.query(
            'CREATE TABLE IF NOT EXISTS test_permissions_table (id SERIAL PRIMARY KEY)',
          );
          await client.query('DROP TABLE IF EXISTS test_permissions_table');
          canCreateTables = true;
        } catch (error) {
          this.logger.warn(`Cannot create tables: ${error.message}`);
        }

        // Test enum creation
        let canCreateEnums = false;
        try {
          await client.query("CREATE TYPE test_enum AS ENUM ('test')");
          await client.query('DROP TYPE IF EXISTS test_enum');
          canCreateEnums = true;
        } catch (error) {
          this.logger.warn(`Cannot create enums: ${error.message}`);
        }

        // Check schema privileges
        const privilegeResult = await client.query(`
          SELECT privilege_type 
          FROM information_schema.schema_privileges 
          WHERE grantee = current_user AND schema_name = 'public'
        `);

        const schemaPrivileges = privilegeResult.rows.map(
          (row) => row.privilege_type,
        );

        return {
          canCreateTables,
          canCreateEnums,
          schemaPrivileges,
        };
      } finally {
        client.release();
      }
    } catch (error) {
      return {
        canCreateTables: false,
        canCreateEnums: false,
        schemaPrivileges: [],
        error: error.message,
      };
    }
  }

  /**
   * Insert client record into tenant database
   */
  private async insertClientRecord(
    databaseName: string,
    userName: string,
    password: string,
    clientData: any,
  ): Promise<void> {
    let tenantPool: Pool | null = null;

    try {
      this.logger.log(
        `Inserting client record into tenant database: ${databaseName}`,
      );

      // Create connection to the tenant database
      tenantPool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: userName,
        password: password,
        database: databaseName,
        max: 2,
        ssl:
          process.env.NODE_ENV === 'production'
            ? { rejectUnauthorized: false }
            : false,
      });

      const client = await tenantPool.connect();

      try {
        // Check if clients table exists
        const tableExists = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'Clients'
          );
        `);

        if (!tableExists.rows[0].exists) {
          this.logger.warn(
            `Clients table not found in tenant database ${databaseName}`,
          );
          return;
        }

        // Insert client record
        await client.query(
          `
          INSERT INTO "Clients" (
            id, name, email, phone, address, status, tier, "createdAt", "updatedAt"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            email = EXCLUDED.email,
            phone = EXCLUDED.phone,
            address = EXCLUDED.address,
            status = EXCLUDED.status,
            tier = EXCLUDED.tier,
            "updatedAt" = EXCLUDED."updatedAt"
        `,
          [
            clientData.id,
            clientData.name,
            clientData.email,
            clientData.phone || null,
            clientData.address || null,
            clientData.status || 'active',
            clientData.tier || 'free',
            new Date(),
            new Date(),
          ],
        );

        this.logger.log(
          `Client record inserted successfully into tenant database: ${databaseName}`,
        );
      } finally {
        client.release();
      }
    } catch (error) {
      this.logger.error(
        `Failed to insert client record into tenant database: ${error.message}`,
      );
      throw error;
    } finally {
      if (tenantPool) {
        await tenantPool.end();
      }
    }
  }

  /**
   * Validate that client record exists in tenant database
   */
  async validateClientExists(
    tenantId: string,
    clientId: string,
  ): Promise<boolean> {
    try {
      const pool = await this.getTenantConnection(tenantId);
      const client = await pool.connect();

      try {
        const result = await client.query(
          `
          SELECT id FROM "Clients" WHERE id = $1
        `,
          [clientId],
        );

        return result.rows.length > 0;
      } finally {
        client.release();
      }
    } catch (error) {
      this.logger.error(`Failed to validate client exists: ${error.message}`);
      return false;
    }
  }

  /**
   * Insert missing client record into tenant database (for existing tenants)
   */
  async ensureClientRecordExists(
    tenantId: string,
    clientData: any,
  ): Promise<void> {
    try {
      const exists = await this.validateClientExists(tenantId, clientData.id);

      if (!exists) {
        this.logger.log(
          `Client record missing in tenant ${tenantId}, inserting...`,
        );

        const credentials = await this.getTenantCredentials(tenantId);
        if (!credentials) {
          throw new Error(`Tenant credentials not found for ${tenantId}`);
        }

        await this.insertClientRecord(
          credentials.databaseName,
          credentials.userName,
          credentials.password,
          clientData,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to ensure client record exists: ${error.message}`,
      );
      throw error;
    }
  } /**
   * Insert user record into tenant database
   */
  private async insertUserRecord(
    databaseName: string,
    userName: string,
    password: string,
    userData: any,
  ): Promise<void> {
    let tenantPool: Pool | null = null;

    try {
      this.logger.log(
        `Inserting user record into tenant database: ${databaseName}`,
      );

      // Create connection to the tenant database
      tenantPool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: userName,
        password: password,
        database: databaseName,
        max: 2,
        ssl:
          process.env.NODE_ENV === 'production'
            ? { rejectUnauthorized: false }
            : false,
      });

      const client = await tenantPool.connect();

      try {
        // Check if Users table exists
        const tableExists = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'Users'
          );
        `);

        if (!tableExists.rows[0].exists) {
          this.logger.warn(
            `Users table not found in tenant database ${databaseName}`,
          );
          return;
        }

        // Insert user record
        const result = await client.query(
          `
          INSERT INTO "Users" (
            id, "firstName", "lastName", email, "passwordHash", role, "clientId", 
            status, otp, "otpExpiresAt", "isOtpUsed", "createdAt", "updatedAt"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (id) DO UPDATE SET
            "firstName" = EXCLUDED."firstName",
            "lastName" = EXCLUDED."lastName",
            email = EXCLUDED.email,
            "passwordHash" = EXCLUDED."passwordHash",
            role = EXCLUDED.role,
            status = EXCLUDED.status,
            "updatedAt" = EXCLUDED."updatedAt"
        `,
          [
            userData.id,
            userData.firstName,
            userData.lastName,
            userData.email,
            userData.passwordHash,
            userData.role,
            userData.clientId,
            userData.status,
            userData.otp || null,
            userData.otpExpiresAt || null,
            userData.isOtpUsed || false,
            userData.createdAt || new Date(),
            new Date(),
          ],
        );

        this.logger.log(
          `User record inserted successfully into tenant database: ${databaseName}`,
        );
      } finally {
        client.release();
      }
    } catch (error) {
      this.logger.error(
        `Failed to insert user record into tenant database: ${error.message}`,
      );
      throw error;
    } finally {
      if (tenantPool) {
        await tenantPool.end();
      }
    }
  } /**
   * Validate that user record exists in tenant database
   */
  async validateUserExists(tenantId: string, userId: string): Promise<boolean> {
    try {
      const pool = await this.getTenantConnection(tenantId);
      const client = await pool.connect();

      try {
        const result = await client.query(
          `
          SELECT id FROM "Users" WHERE id = $1
        `,
          [userId],
        );

        return result.rows.length > 0;
      } finally {
        client.release();
      }
    } catch (error) {
      this.logger.error(`Failed to validate user exists: ${error.message}`);
      return false;
    }
  } /**
   * Insert missing user record into tenant database (for existing tenants)
   */
  async ensureUserRecordExists(tenantId: string, userData: any): Promise<void> {
    try {
      const exists = await this.validateUserExists(tenantId, userData.id);

      if (!exists) {
        this.logger.log(
          `User record missing in tenant ${tenantId}, inserting...`,
        );

        const credentials = await this.getTenantCredentials(tenantId);
        if (!credentials) {
          throw new Error(`Tenant credentials not found for ${tenantId}`);
        }

        await this.insertUserRecord(
          credentials.databaseName,
          credentials.userName,
          credentials.password,
          userData,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to ensure user record exists: ${error.message}`,
      );
      throw error;
    }
  }
}
