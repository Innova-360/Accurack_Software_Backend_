import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PermissionsService } from './permissions.service';

@Injectable()
export class PermissionsInitializationService implements OnModuleInit {
  private readonly logger = new Logger(PermissionsInitializationService.name);

  constructor(private permissionsService: PermissionsService) {}
  async onModuleInit() {
    try {
      this.logger.log('Initializing default role templates...');
      await this.permissionsService.initializeDefaultRoles(); // No user ID - will find super admin automatically
      this.logger.log('Default role templates initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize default role templates:', error);
      // Don't throw error to prevent app startup failure
    }
  }
}
