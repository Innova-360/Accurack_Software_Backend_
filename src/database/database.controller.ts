import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaClientService } from '../prisma-client/prisma-client.service';
import { MultiTenantService } from './multi-tenant.service';
import { UseMasterDB } from '../common';

@ApiTags('Database Management')
@Controller('database')
@UseMasterDB()
export class DatabaseController {
  constructor(
    private readonly prisma: PrismaClientService,
    private readonly multiTenantService: MultiTenantService,
  ) {}

  @ApiOperation({ 
    summary: 'List all tenant databases', 
    description: 'Returns connection information for all tenant databases. Useful for connecting external DB tools like TablePlus.' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Tenant database list retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Tenant databases retrieved successfully' },
        data: {
          type: 'object',
          properties: {
            masterDatabase: {
              type: 'object',
              properties: {
                name: { type: 'string', example: 'accurack_master' },
                host: { type: 'string', example: 'localhost' },
                port: { type: 'number', example: 5432 },
                username: { type: 'string', example: 'accurack_admin' },
                description: { type: 'string', example: 'Master database containing all clients and users' }
              }
            },
            tenantDatabases: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  clientId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
                  clientName: { type: 'string', example: 'Acme Corporation' },
                  databaseName: { type: 'string', example: 'client_123e4567_db' },
                  username: { type: 'string', example: 'user_123e4567' },
                  host: { type: 'string', example: 'localhost' },
                  port: { type: 'number', example: 5432 },
                  description: { type: 'string', example: 'Tenant database for Acme Corporation' }
                }
              }
            }
          }
        }
      }
    }
  })
  @Get('tenant-connections')
  async getTenantConnections() {
    try {
      // Get all clients from master database
      const clients = await this.prisma.clients.findMany({
        select: {
          id: true,
          name: true,
          status: true,
          createdAt: true,
        },
        where: {
          status: 'active',
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const masterDatabase = {
        name: process.env.DB_NAME || 'accurack_master',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USER || 'accurack_admin',
        description: 'Master database containing all clients, users, and tenant metadata',
      };

      const tenantDatabases = clients.map(client => ({
        clientId: client.id,
        clientName: client.name,
        databaseName: `client_${client.id}_db`,
        username: `user_${client.id}`,
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        description: `Tenant database for ${client.name}`,
        note: 'Password is stored in master database credentials table'
      }));

      return {
        success: true,
        message: 'Tenant databases retrieved successfully',
        data: {
          masterDatabase,
          tenantDatabases,
          totalTenants: tenantDatabases.length,
          instructions: {
            tableplus: 'Use these connection details in TablePlus to connect to each database',
            password: 'Query the master database credentials table for tenant passwords'
          }
        },
      };
    } catch (error) {
      console.error('Get tenant connections error:', error);
      return {
        success: false,
        message: 'Failed to retrieve tenant database connections',
        error: error.message,
      };
    }
  }

  @ApiOperation({ 
    summary: 'Get tenant database credentials', 
    description: 'Returns the actual password for a specific tenant database' 
  })
  @Get('tenant-credentials/:clientId')
  async getTenantCredentials(@Param('clientId') clientId: string) {
    try {
      // This would need to access the credentials from MultiTenantService
      // For security, you might want to restrict this endpoint
      
      return {
        success: true,
        message: 'For security reasons, use the MultiTenantService to get credentials',
        note: 'Check your MultiTenantService for credential retrieval methods'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve credentials',
        error: error.message,
      };
    }
  }

  @ApiOperation({ 
    summary: 'Validate client record in tenant database', 
    description: 'Checks if a client record exists in the tenant database' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Client validation completed',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            clientId: { type: 'string' },
            exists: { type: 'boolean' },
            tenantId: { type: 'string' }
          }
        }
      }
    }
  })  @Get('validate-client/:clientId/:tenantId')
  async validateClientExists(
    @Param('clientId') clientId: string,
    @Param('tenantId') tenantId: string
  ) {
    try {
      const exists = await this.multiTenantService.validateClientExists(tenantId, clientId);
      
      return {
        success: true,
        message: exists ? 'Client record exists in tenant database' : 'Client record missing in tenant database',
        data: {
          clientId,
          tenantId,
          exists,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to validate client record',
        error: error.message,
      };
    }
  }

  @ApiOperation({ 
    summary: 'Validate user record in tenant database', 
    description: 'Checks if a user record exists in the tenant database' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User validation completed',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
            exists: { type: 'boolean' },
            tenantId: { type: 'string' }
          }
        }
      }
    }
  })
  @Get('validate-user/:userId/:tenantId')
  async validateUserExists(
    @Param('userId') userId: string,
    @Param('tenantId') tenantId: string
  ) {
    try {
      const exists = await this.multiTenantService.validateUserExists(tenantId, userId);
      
      return {
        success: true,
        message: exists ? 'User record exists in tenant database' : 'User record missing in tenant database',
        data: {
          userId,
          tenantId,
          exists,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to validate user record',
        error: error.message,
      };
    }
  }

  @ApiOperation({ 
    summary: 'Get user info by email', 
    description: 'Get user information by email address' 
  })
  @Get('user-info/:email')
  async getUserInfoByEmail(@Param('email') email: string) {
    try {
      const user = await this.prisma.users.findUnique({
        where: { email },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          clientId: true,
          status: true,
          createdAt: true,
        },
      });

      if (!user) {
        return {
          success: false,
          message: 'User not found',
          data: null,
        };
      }

      return {
        success: true,
        message: 'User found',
        data: user,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to get user info',
        error: error.message,
      };
    }
  }

  @ApiOperation({ 
    summary: 'List users for client', 
    description: 'Get all users for a specific client' 
  })
  @Get('client-users/:clientId')
  async getClientUsers(@Param('clientId') clientId: string) {
    try {
      const users = await this.prisma.users.findMany({
        where: { clientId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          clientId: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return {
        success: true,
        message: 'Users retrieved successfully',
        data: {
          clientId,
          users,
          count: users.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to get client users',
        error: error.message,
      };
    }
  }
}
