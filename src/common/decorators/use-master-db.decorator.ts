import { SetMetadata } from '@nestjs/common';

export const USE_MASTER_DB_KEY = 'useMasterDB';

/**
 * Decorator to force a controller/method to use the master database
 * instead of tenant-specific database
 */
export const UseMasterDB = () => SetMetadata(USE_MASTER_DB_KEY, true);
