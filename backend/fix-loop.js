// Comprehensive fix loop - runs until all issues are resolved
const { execSync } = require('child_process');
const fs = require('node:fs');
const http = require('node:http');

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
      headers: { 'Accept': 'application/json', 'Authorization': `Basic ${auth}` }
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
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

async function getIssueCount(projectKey) {
  try {
    const response = await makeRequest(`/api/issues/search?componentKeys=${projectKey}&resolved=false&ps=1`);
    return response.status === 200 ? response.data.total : -1;
  } catch (error) {
    return -1;
  }
}

async function runAnalysis(project) {
  console.log(`\nRunning ${project} analysis...`);
  try {
    const result = execSync(`cd ${project} && sonar-scanner`, { encoding: 'utf8', stdio: 'pipe' });
    return { success: true, output: result };
  } catch (error) {
    return { success: false, output: error.stdout || error.message };
  }
}

async function main() {
  let iteration = 0;
  const maxIterations = 10;
  
  while (iteration < maxIterations) {
    iteration++;
    console.log(`\n=== Iteration ${iteration} ===`);
    
    // Get current issue counts
    const backendCount = await getIssueCount('enterprise-reimbursement-backend');
    const frontendCount = await getIssueCount('enterprise-reimbursement-frontend');
    
    console.log(`Backend Issues: ${backendCount}`);
    console.log(`Frontend Issues: ${frontendCount}`);
    
    if (backendCount === 0 && frontendCount === 0) {
      console.log('\n✅ ALL ISSUES RESOLVED!');
      break;
    }
    
    if (backendCount > 0) {
      console.log('\nFixing backend issues...');
      // Run analysis to get latest issues
      await runAnalysis('../backend');
      // Issues will be fixed manually or via automated scripts
    }
    
    if (frontendCount > 0) {
      console.log('\nFixing frontend issues...');
      await runAnalysis('../frontend');
    }
    
    // Wait a bit before next iteration
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  if (iteration >= maxIterations) {
    console.log('\n⚠️  Reached max iterations. Some issues may remain.');
  }
}

main().catch(console.error);


