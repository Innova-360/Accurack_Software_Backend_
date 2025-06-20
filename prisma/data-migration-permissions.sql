-- Data Migration: Transform existing permissions from single action to actions array
-- This script should be run BEFORE the schema migration to preserve existing data

-- Step 1: Create a temporary table to store the transformed data
CREATE TEMP TABLE temp_permissions_grouped AS
SELECT 
    userId,
    storeId,
    resource,
    resourceId,
    granted,
    grantedBy,
    grantedAt,
    expiresAt,
    conditions,
    -- Group actions into array, preserving the first record's metadata
    ARRAY_AGG(DISTINCT 
        CASE 
            WHEN action = 'create' THEN 'create'
            WHEN action = 'read' THEN 'read'
            WHEN action = 'update' THEN 'update'
            WHEN action = 'delete' THEN 'delete'
        END
    ) as actions,
    MIN(createdAt) as createdAt,
    MAX(updatedAt) as updatedAt,
    MIN(id) as keep_id  -- Keep the earliest ID for the group
FROM permissions 
WHERE action IS NOT NULL
GROUP BY userId, storeId, resource, resourceId, granted, grantedBy, grantedAt, expiresAt, conditions;

-- Step 2: Note the count before transformation
-- SELECT 'Before migration' as stage, COUNT(*) as permission_count FROM permissions;

-- Step 3: After the schema migration runs, we'll need to populate the actions array
-- This part will be handled by the application code or a separate script

-- Step 4: Verification queries (to be run after migration)
-- SELECT 'After migration' as stage, COUNT(*) as permission_count FROM permissions;
-- SELECT 'Sample actions arrays' as info, actions FROM permissions LIMIT 5;

-- Note: The actual data transformation will be handled by application code
-- because PostgreSQL array operations are more complex in pure SQL
