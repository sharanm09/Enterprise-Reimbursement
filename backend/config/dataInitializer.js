// Removed circular dependency: pool is now passed as an argument
const logger = require('../utils/logger');

const ROLES = [
    { name: 'superadmin', display_name: 'Super Admin', description: 'Full system access' },
    { name: 'finance', display_name: 'Finance', description: 'Finance department access' },
    { name: 'hr', display_name: 'HR', description: 'Human Resources access' },
    { name: 'manager', display_name: 'Manager', description: 'Manager access' },
    { name: 'employee', display_name: 'Employee', description: 'Employee access' }
];

const DEFAULT_STATS = [
    { title: 'My Reimbursements', value: '0', subtitle: 'Pending: $0', icon: 'FiFileText', emoji: '📝', role_name: 'employee', display_order: 1 },
    { title: 'Total Users', value: '0', icon: 'FiUsers', emoji: '👥', role_name: 'superadmin', display_order: 2 },
    { title: 'Departments', value: '0', icon: 'FiBriefcase', emoji: '🏢', role_name: 'superadmin', display_order: 3 },
    { title: 'Cost Centers', value: '0', icon: 'FiDollarSign', emoji: '💰', role_name: 'superadmin', display_order: 4 },
    { title: 'Projects', value: '0', icon: 'FiFolder', emoji: '📁', role_name: 'superadmin', display_order: 5 },
    { title: 'Pending Approvals', value: '0', subtitle: 'Amount: $0', icon: 'FiCheckCircle', emoji: '✅', role_name: 'manager', display_order: 8 },
    { title: 'Pending Approvals', value: '0', subtitle: 'Amount: $0', icon: 'FiCheckCircle', emoji: '✅', role_name: 'hr', display_order: 9 },
    { title: 'Pending Approvals', value: '0', subtitle: 'Amount: $0', icon: 'FiCheckCircle', emoji: '✅', role_name: 'finance', display_order: 10 }
];

const EXPENSE_CATEGORIES = [
    { name: 'Food', code: 'FOOD' },
    { name: 'Travel', code: 'TRAVEL' },
    { name: 'Accommodation', code: 'ACCOMMODATION' },
    { name: 'Material', code: 'MATERIAL' },
    { name: 'Others', code: 'OTHERS' }
];

const DEPARTMENTS = [
    { code: 'DEPT-001', name: 'Engineering', description: 'Engineering Department' },
    { code: 'DEPT-002', name: 'Sales', description: 'Sales Department' },
    { code: 'DEPT-003', name: 'Marketing', description: 'Marketing Department' },
    { code: 'DEPT-004', name: 'HR', description: 'Human Resources' },
    { code: 'DEPT-005', name: 'Finance', description: 'Finance Department' }
];

const COST_CENTERS = [
    { code: 'CC-001', name: 'R&D', budget: 100000, department_id: 1 },
    { code: 'CC-002', name: 'Product Development', budget: 150000, department_id: 1 },
    { code: 'CC-003', name: 'Sales Operations', budget: 75000, department_id: 2 },
    { code: 'CC-004', name: 'Marketing Campaigns', budget: 80000, department_id: 3 },
    { code: 'CC-005', name: 'Admin', budget: 50000, department_id: 4 }
];

const PROJECTS = [
    { code: 'PROJ-001', name: 'Project Alpha', description: 'Alpha Project', start_date: '2024-01-01', status: 'active' },
    { code: 'PROJ-002', name: 'Project Beta', description: 'Beta Project', start_date: '2024-02-01', status: 'active' },
    { code: 'PROJ-003', name: 'Project Gamma', description: 'Gamma Project', start_date: '2024-03-01', status: 'planning' }
];

async function seedRoles(pool) {
    console.log('[DB] Seeding roles...');
    for (const role of ROLES) {
        await pool.query(
            'INSERT INTO roles (name, display_name, description) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING',
            [role.name, role.display_name, role.description]
        );
    }
}

async function seedExpenseCategories(pool) {
    console.log('[DB] Seeding expense categories...');
    for (const category of EXPENSE_CATEGORIES) {
        await pool.query(
            'INSERT INTO expense_categories (name, code) VALUES ($1, $2) ON CONFLICT (code) DO NOTHING',
            [category.name, category.code]
        );
    }
}

async function seedDashboardStats(pool) {
    console.log('[DB] Seeding dashboard stats...');
    for (const stat of DEFAULT_STATS) {
        const existing = await pool.query(
            'SELECT id FROM dashboard_stats WHERE title = $1 AND role_name = $2',
            [stat.title, stat.role_name]
        );

        if (existing.rows.length === 0) {
            await pool.query(
                'INSERT INTO dashboard_stats (title, value, subtitle, icon, emoji, role_name, display_order) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [stat.title, stat.value, stat.subtitle || null, stat.icon, stat.emoji, stat.role_name, stat.display_order]
            );
        }
    }
}

async function seedDepartments(pool) {
    // Check if departments exist
    const result = await pool.query('SELECT COUNT(*) FROM departments');
    if (result.rows[0].count > 0) return;

    console.log('[DB] Seeding departments...');
    for (const dept of DEPARTMENTS) {
        await pool.query(
            `INSERT INTO departments (code, name, description) VALUES ($1, $2, $3)`,
            [dept.code, dept.name, dept.description]
        );
    }
}

async function seedCostCenters(pool) {
    // Check if cost centers exist
    const result = await pool.query('SELECT COUNT(*) FROM cost_centers');
    if (result.rows[0].count > 0) return;

    console.log('[DB] Seeding cost centers...');
    // We need to fetch department IDs correctly instead of hardcoding
    const depts = await pool.query('SELECT id, name FROM departments');
    const deptMap = {};
    depts.rows.forEach(d => deptMap[d.name] = d.id);

    // Map the hardcoded IDs in CONSTANT to actual DB IDs based on department name logic if possible, 
    // or just assume the order if we just inserted them.
    // For robustness, let's map by name logic that was implied in the original file:
    // 1 -> Engineering, 2 -> Sales, 3 -> Marketing, 4 -> HR, 5 -> Finance

    // Better yet, update cost centers definition to use Department Names for lookup if we want to be pure,
    // but sticking to the original logic which hardcoded IDs:
    // We should probably rely on the fact that we just inserted them in order.
    // However, if IDs are UUIDs, hardcoding 1,2,3 won't work.

    // Rereading original database.js:
    // It used hardcoded IDs: department_id: 1, 2, 3...
    // But createRolesTable used validateIdColumnDef which defaults to UUID or SERIAL.
    // If it's UUID, '1' will fail. 
    // Let's check `database.js` lines 498-500. `useUUID` checks if 'id' in 'roles' is uuid.
    // If it's a new DB, it defaults to UUID (line 335 ID_COLUMN_DEFS.UUID).

    // CRITICAL FIX: The original code might have been broken for UUIDs if it used hardcoded integers for FKs.
    // I need to fetch the IDs.

    const deptMapping = {
        'Engineering': ['R&D', 'Product Development'],
        'Sales': ['Sales Operations'],
        'Marketing': ['Marketing Campaigns'],
        'HR': ['Admin']
    };

    for (const cc of COST_CENTERS) {
        // Find which department name corresponds to the original ID logic or just assume mapping
        let deptName;
        if (cc.department_id === 1) deptName = 'Engineering';
        else if (cc.department_id === 2) deptName = 'Sales';
        else if (cc.department_id === 3) deptName = 'Marketing';
        else if (cc.department_id === 4) deptName = 'HR';

        if (deptName && deptMap[deptName]) {
            await pool.query(
                `INSERT INTO cost_centers (code, name, budget, department_id) 
                 VALUES ($1, $2, $3, $4)`,
                [cc.code, cc.name, cc.budget, deptMap[deptName]]
            );
        }
    }
}

async function seedProjects(pool) {
    const result = await pool.query('SELECT COUNT(*) FROM projects');
    if (result.rows[0].count > 0) return;

    console.log('[DB] Seeding projects...');
    for (const project of PROJECTS) {
        await pool.query(
            `INSERT INTO projects (code, name, description, start_date, status) 
         VALUES ($1, $2, $3, $4, $5)`,
            [project.code, project.name, project.description, project.start_date, project.status]
        );
    }
}

async function seedUsers(pool) {
    const result = await pool.query('SELECT COUNT(*) FROM users');
    if (result.rows[0].count > 0) return;

    console.log('[DB] Seeding users...');

    // Get role IDs
    const rolesResult = await pool.query('SELECT id, name FROM roles');
    const roleMap = {};
    rolesResult.rows.forEach(role => {
        roleMap[role.name] = role.id;
    });

    // Get department IDs
    const deptsResult = await pool.query('SELECT id, name FROM departments');
    const deptMap = {};
    deptsResult.rows.forEach(dept => {
        deptMap[dept.name] = dept.id;
    });

    const sampleUsers = [
        {
            azure_id: 'admin-001',
            display_name: 'Admin User',
            email: process.env.SUPER_ADMIN_EMAIL || 'admin@qwikhire.ai',
            role_id: roleMap['superadmin']
        },
        {
            azure_id: 'finance-001',
            display_name: 'Sarah Finance',
            email: 'sarah.finance@company.com',
            role_id: roleMap['finance']
        },
        {
            azure_id: 'hr-001',
            display_name: 'John HR',
            email: 'john.hr@company.com',
            role_id: roleMap['hr']
        },
        {
            azure_id: 'manager-001',
            display_name: 'Mike Manager',
            email: 'mike.manager@company.com',
            role_id: roleMap['manager'],
            department_id: deptMap['Sales']
        },
        {
            azure_id: 'employee-001',
            display_name: 'Alice Employee',
            email: 'alice.employee@company.com',
            role_id: roleMap['employee']
        },
        {
            azure_id: 'employee-002',
            display_name: 'Bob Employee',
            email: 'bob.employee@company.com',
            role_id: roleMap['employee']
        }
    ];

    for (const user of sampleUsers) {
        await pool.query(
            `INSERT INTO users (azure_id, display_name, email, role_id, department_id, last_login) 
         VALUES ($1, $2, $3, $4, $5, NOW())`,
            [user.azure_id, user.display_name, user.email, user.role_id, user.department_id || null]
        );
    }
}

async function assignDefaultRoles(pool) {
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@qwikhire.ai';
    // Check if roles exist first
    const employeeRole = await pool.query('SELECT id FROM roles WHERE name = $1', ['employee']);
    const superAdminRole = await pool.query('SELECT id FROM roles WHERE name = $1', ['superadmin']);

    if (employeeRole.rows.length > 0 && superAdminRole.rows.length > 0) {
        await pool.query(
            'UPDATE users SET role_id = $1 WHERE email = $2 AND role_id IS NULL',
            [superAdminRole.rows[0].id, superAdminEmail]
        );

        await pool.query(
            'UPDATE users SET role_id = $1 WHERE email != $2 AND role_id IS NULL',
            [employeeRole.rows[0].id, superAdminEmail]
        );
    }

    // Ensure Mike Manager is in Sales department
    const salesDept = await pool.query('SELECT id FROM departments WHERE name = $1', ['Sales']);
    if (salesDept.rows.length > 0) {
        await pool.query(
            "UPDATE users SET department_id = $1 WHERE email = 'mike.manager@company.com' AND department_id IS NULL",
            [salesDept.rows[0].id]
        );
    }
}

async function seedDatabase(pool) {
    try {
        console.log('[DataInitializer] Starting data seeding...');

        await seedRoles(pool);
        await seedExpenseCategories(pool);
        await seedDashboardStats(pool);
        await seedDepartments(pool);
        // Cost centers depend on departments
        await seedCostCenters(pool);
        await seedProjects(pool);
        // Users depend on roles
        await seedUsers(pool);
        await assignDefaultRoles(pool);

        console.log('[DataInitializer] ✅ Data seeding completed successfully');
        logger.info('Data seeding completed successfully');
    } catch (error) {
        console.error('[DataInitializer] ❌ Error seeding data:', error);
        logger.error('Error seeding data:', error);
        throw error;
    }
}

module.exports = {
    seedDatabase
};
