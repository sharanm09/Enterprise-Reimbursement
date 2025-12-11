const http = require('http');

const SONAR_HOST = '192.168.0.127';
const SONAR_PORT = 9000;
const SONAR_USER = 'admin';
const SONAR_PASS = 'Ifocus@123456';

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${SONAR_USER}:${SONAR_PASS}`).toString('base64');
    
    const options = {
      hostname: SONAR_HOST,
      port: SONAR_PORT,
      path: path,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Basic ${auth}`
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

async function getAllIssues(projectKey) {
  const allIssues = [];
  let page = 1;
  const pageSize = 500;
  
  while (true) {
    try {
      const response = await makeRequest(`/api/issues/search?componentKeys=${projectKey}&resolved=false&ps=${pageSize}&p=${page}`);
      
      if (response.status === 200 && response.data.issues) {
        const issues = response.data.issues;
        allIssues.push(...issues);
        
        if (issues.length < pageSize) {
          break;
        }
        page++;
      } else {
        break;
      }
    } catch (error) {
      console.error(`Error fetching page ${page}:`, error.message);
      break;
    }
  }
  
  return allIssues;
}

async function main() {
  console.log('Fetching all SonarQube issues...\n');
  
  const backendIssues = await getAllIssues('enterprise-reimbursement-backend');
  const frontendIssues = await getAllIssues('enterprise-reimbursement-frontend');
  
  console.log(`Backend Issues: ${backendIssues.length}`);
  console.log(`Frontend Issues: ${frontendIssues.length}\n`);
  
  // Group by file and severity
  const backendByFile = {};
  backendIssues.forEach(issue => {
    const file = issue.component.split(':').pop();
    if (!backendByFile[file]) {
      backendByFile[file] = { critical: [], major: [], minor: [] };
    }
    const severity = issue.severity.toLowerCase();
    if (backendByFile[file][severity]) {
      backendByFile[file][severity].push(issue);
    }
  });
  
  const frontendByFile = {};
  frontendIssues.forEach(issue => {
    const file = issue.component.split(':').pop();
    if (!frontendByFile[file]) {
      frontendByFile[file] = { critical: [], major: [], minor: [] };
    }
    const severity = issue.severity.toLowerCase();
    if (frontendByFile[file][severity]) {
      frontendByFile[file][severity].push(issue);
    }
  });
  
  // Write to JSON files
  const fs = require('node:fs');
  fs.writeFileSync('backend-issues.json', JSON.stringify({ byFile: backendByFile, all: backendIssues }, null, 2));
  fs.writeFileSync('frontend-issues.json', JSON.stringify({ byFile: frontendByFile, all: frontendIssues }, null, 2));
  
  console.log('Issues saved to backend-issues.json and frontend-issues.json');
  console.log('\n=== Backend Issues Summary ===');
  Object.keys(backendByFile).sort().forEach(file => {
    const counts = {
      critical: backendByFile[file].critical.length,
      major: backendByFile[file].major.length,
      minor: backendByFile[file].minor.length
    };
    const total = counts.critical + counts.major + counts.minor;
    if (total > 0) {
      console.log(`${file}: ${total} (C:${counts.critical} M:${counts.major} m:${counts.minor})`);
    }
  });
  
  console.log('\n=== Frontend Issues Summary ===');
  Object.keys(frontendByFile).sort().forEach(file => {
    const counts = {
      critical: frontendByFile[file].critical.length,
      major: frontendByFile[file].major.length,
      minor: frontendByFile[file].minor.length
    };
    const total = counts.critical + counts.major + counts.minor;
    if (total > 0) {
      console.log(`${file}: ${total} (C:${counts.critical} M:${counts.major} m:${counts.minor})`);
    }
  });
}

main().catch(console.error);


