-- PostgreSQL SQL script to create dummy test users
-- This script creates test users for all roles: employee, manager, hr, and finance

BEGIN;

-- Create or update test users
-- Note: This uses UPSERT (INSERT ... ON CONFLICT) to handle existing users

-- 1. Create Manager user first (needed for employee's manager_id)
INSERT INTO users (email, display_name, azure_id, role_id, manager_id, created_at, updated_at)
VALUES (
  'manager@test.com',
  'Test Manager',
  'test-manager-001',
  (SELECT id FROM roles WHERE name = 'manager' LIMIT 1),
  NULL,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (email) 
DO UPDATE SET
  display_name = EXCLUDED.display_name,
  azure_id = EXCLUDED.azure_id,
  role_id = EXCLUDED.role_id,
  updated_at = CURRENT_TIMESTAMP;

-- 2. Create HR user
INSERT INTO users (email, display_name, azure_id, role_id, manager_id, created_at, updated_at)
VALUES (
  'hr@test.com',
  'Test HR',
  'test-hr-001',
  (SELECT id FROM roles WHERE name = 'hr' LIMIT 1),
  NULL,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (email) 
DO UPDATE SET
  display_name = EXCLUDED.display_name,
  azure_id = EXCLUDED.azure_id,
  role_id = EXCLUDED.role_id,
  updated_at = CURRENT_TIMESTAMP;

-- 3. Create Finance user
INSERT INTO users (email, display_name, azure_id, role_id, manager_id, created_at, updated_at)
VALUES (
  'finance@test.com',
  'Test Finance',
  'test-finance-001',
  (SELECT id FROM roles WHERE name = 'finance' LIMIT 1),
  NULL,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (email) 
DO UPDATE SET
  display_name = EXCLUDED.display_name,
  azure_id = EXCLUDED.azure_id,
  role_id = EXCLUDED.role_id,
  updated_at = CURRENT_TIMESTAMP;

-- 4. Create Employee user with manager relationship
INSERT INTO users (email, display_name, azure_id, role_id, manager_id, created_at, updated_at)
VALUES (
  'employee@test.com',
  'Test Employee',
  'test-employee-001',
  (SELECT id FROM roles WHERE name = 'employee' LIMIT 1),
  (SELECT id FROM users WHERE email = 'manager@test.com' LIMIT 1),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (email) 
DO UPDATE SET
  display_name = EXCLUDED.display_name,
  azure_id = EXCLUDED.azure_id,
  role_id = EXCLUDED.role_id,
  manager_id = (SELECT id FROM users WHERE email = 'manager@test.com' LIMIT 1),
  updated_at = CURRENT_TIMESTAMP;

-- Optional: Set superadmin self-reference for testing
-- Uncomment and modify the email below if you want to set a superadmin's manager_id to itself
/*
UPDATE users 
SET manager_id = id 
WHERE email = 'admin@qwikhire.ai'  -- Change this to your superadmin email
  AND manager_id IS NULL;
*/

COMMIT;

-- Display created users
SELECT 
  u.id,
  u.email,
  u.display_name,
  u.azure_id,
  r.name as role_name,
  m.email as manager_email
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
LEFT JOIN users m ON u.manager_id = m.id
WHERE u.email IN (
  'employee@test.com',
  'manager@test.com',
  'hr@test.com',
  'finance@test.com'
)
ORDER BY r.name;

