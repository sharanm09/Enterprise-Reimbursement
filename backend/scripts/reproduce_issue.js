const API_URL = 'http://localhost:5000/api/auth';

async function reproduce() {
    try {
        console.log('Node version:', process.version);

        // 1. Get test users
        console.log('Fetching test users...');
        const usersRes = await fetch(`${API_URL}/test-users`);
        if (!usersRes.ok) {
            console.error('Failed to fetch test users:', usersRes.status, await usersRes.text());
            return;
        }
        const usersData = await usersRes.json();

        const superAdmin = usersData.users.find(u => u.role && u.role.name === 'superadmin');
        if (!superAdmin) {
            console.error('No superadmin found in test users.');
            return;
        }
        console.log('Found superadmin:', superAdmin.email);

        // 2. Login
        console.log('Logging in...');
        const loginRes = await fetch(`${API_URL}/test-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: superAdmin.id })
        });

        if (!loginRes.ok) {
            console.error('Login failed:', await loginRes.text());
            return;
        }

        // Get cookies
        let cookies = [];
        if (loginRes.headers.getSetCookie) {
            cookies = loginRes.headers.getSetCookie();
        } else {
            const cookieHeader = loginRes.headers.get('set-cookie');
            if (cookieHeader) cookies = [cookieHeader];
        }

        const cookieString = cookies.join('; ');
        console.log('Cookies used:', cookieString.length > 0);

        // 3. Get Roles
        console.log('Fetching roles...');
        const rolesRes = await fetch(`${API_URL}/roles`, {
            headers: { 'Cookie': cookieString || '' }
        });

        if (!rolesRes.ok) {
            console.error('Failed to fetch roles:', rolesRes.status, await rolesRes.text());
            return;
        }

        const rolesData = await rolesRes.json();
        const employeeRole = rolesData.roles.find(r => r.name === 'employee');
        const roleId = employeeRole.id;
        console.log('Using roleId:', roleId);

        // 4. Create User
        console.log('Creating user...');
        const newUser = {
            displayName: 'Debug User',
            email: `debug.user.${Date.now()}@test.com`,
            roleId: roleId,
            managerId: '',
            bankAccountNo: '1234567890'
        };

        const createRes = await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookieString || ''
            },
            body: JSON.stringify(newUser)
        });

        console.log('Status:', createRes.status);
        const result = await createRes.json();
        console.log('Result:', JSON.stringify(result, null, 2));
        if (result.stack) {
            console.log('STACK TRACE:');
            console.log(result.stack);
        } else {
            console.log('No stack trace in result.');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

reproduce();
