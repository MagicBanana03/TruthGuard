# Database Migration Guide

## Overview

This guide explains how to migrate your TruthGuard database to support user-specific articles without losing existing data.

## What the Migration Does

1. **Adds `user_id` column** to the `articles` table
2. **Adds `user_id` column** to the `feedback` table  
3. **Updates unique constraints** to prevent duplicate articles per user
4. **Assigns existing articles** to the first user account
5. **Creates a backup** of your database before making changes

## Running the Migration

### Step 1: Stop the Application
Make sure TruthGuard is not running before starting the migration.

### Step 2: Run the Migration Script
```bash
python migrate_database.py
```

### Step 3: Follow the Prompts
The script will:
- Ask for confirmation before proceeding
- Create a backup of your current database
- Show progress for each migration step
- Verify the migration was successful

### Step 4: Restart the Application
After successful migration, you can restart TruthGuard normally.

## Migration Steps in Detail

### 1. Database Backup
- Creates a timestamped backup file (e.g., `truthguard.db.backup_20250107_143022`)
- Keeps your original data safe in case of issues

### 2. Schema Updates
- Adds `user_id INTEGER` column to `articles` table
- Adds `user_id INTEGER` column to `feedback` table
- Updates unique constraint to `UNIQUE(title, content, user_id)`

### 3. Data Migration
- Assigns all existing articles to the first user account
- If no users exist, creates a temporary migration user
- Preserves all existing article data and relationships

### 4. Verification
- Confirms all columns were added successfully
- Ensures all articles have user assignments
- Validates the new schema structure

## Troubleshooting

### Migration Fails
1. Check the error message for specific details
2. Restore from backup if needed:
   ```bash
   cp instance/truthguard.db.backup_TIMESTAMP instance/truthguard.db
   ```
3. Fix the issue and run migration again

### "Column already exists" Error
This is normal if you run the migration multiple times. The script will detect existing columns and skip them.

### No Users Found
The migration will create a temporary user called `migration_user` to assign existing articles to. You should:
1. Create your actual user accounts after migration
2. Optionally reassign articles from `migration_user` to real users
3. Delete the `migration_user` if no longer needed

## Post-Migration Notes

### User Isolation
After migration:
- Each user only sees their own articles in the history page
- New articles are automatically associated with the logged-in user
- Existing articles are assigned to the first user account

### Reassigning Articles
If you need to reassign articles to different users:

```sql
-- View current assignments
SELECT a.id, a.title, u.username 
FROM articles a 
LEFT JOIN users u ON a.user_id = u.id;

-- Reassign articles to a different user
UPDATE articles 
SET user_id = (SELECT id FROM users WHERE username = 'target_user')
WHERE user_id = (SELECT id FROM users WHERE username = 'source_user');
```

### Backup Management
- Keep the backup until you've verified everything works correctly
- Delete old backups to save space: `rm instance/truthguard.db.backup_*`

## Manual Migration (Advanced)

If the automatic migration fails, you can run SQL commands manually:

```sql
-- Add user_id columns
ALTER TABLE articles ADD COLUMN user_id INTEGER;
ALTER TABLE feedback ADD COLUMN user_id INTEGER;

-- Assign articles to first user
UPDATE articles 
SET user_id = (SELECT id FROM users ORDER BY id LIMIT 1) 
WHERE user_id IS NULL;
```

## Support

If you encounter issues:
1. Check the migration script output for error details
2. Ensure you have proper file permissions
3. Verify SQLite database is not corrupted
4. Contact support with the specific error message

## Migration Checklist

- [ ] Application stopped
- [ ] Backup created successfully  
- [ ] Migration script completed without errors
- [ ] All articles have user assignments
- [ ] Application starts normally after migration
- [ ] History page shows user-specific data
- [ ] New articles are properly associated with users
