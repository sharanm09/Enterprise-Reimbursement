// Script to systematically fix all SonarQube issues
const fs = require('node:fs');
const issues = JSON.parse(fs.readFileSync('backend-issues.json', 'utf8'));

console.log('=== Fixing All SonarQube Issues ===\n');

// Group issues by type
const issueTypes = {
  cognitiveComplexity: [],
  optionalChain: [],
  uselessAssignment: [],
  negatedCondition: [],
  parseFloat: [],
  unusedVariable: [],
  setInsteadOfArray: [],
  other: []
};

issues.all.forEach(issue => {
  const msg = issue.message.toLowerCase();
  if (msg.includes('cognitive complexity')) {
    issueTypes.cognitiveComplexity.push(issue);
  } else if (msg.includes('optional chain')) {
    issueTypes.optionalChain.push(issue);
  } else if (msg.includes('useless assignment') || msg.includes('redundant assignment')) {
    issueTypes.uselessAssignment.push(issue);
  } else if (msg.includes('negated condition')) {
    issueTypes.negatedCondition.push(issue);
  } else if (msg.includes('parsefloat')) {
    issueTypes.parseFloat.push(issue);
  } else if (msg.includes('unused')) {
    issueTypes.unusedVariable.push(issue);
  } else if (msg.includes('set') && msg.includes('has')) {
    issueTypes.setInsteadOfArray.push(issue);
  } else {
    issueTypes.other.push(issue);
  }
});

console.log('Issue Summary:');
console.log(`  Cognitive Complexity: ${issueTypes.cognitiveComplexity.length}`);
console.log(`  Optional Chain: ${issueTypes.optionalChain.length}`);
console.log(`  Useless Assignment: ${issueTypes.uselessAssignment.length}`);
console.log(`  Negated Condition: ${issueTypes.negatedCondition.length}`);
console.log(`  ParseFloat: ${issueTypes.parseFloat.length}`);
console.log(`  Unused Variable: ${issueTypes.unusedVariable.length}`);
console.log(`  Set Instead of Array: ${issueTypes.setInsteadOfArray.length}`);
console.log(`  Other: ${issueTypes.other.length}\n`);

// Write fix plan
const fixPlan = {
  backend: {
    'config/database.js': [
      'Fix cognitive complexity by extracting helper functions',
      'Use Set instead of array for columnNames',
      'Fix string concatenation in SQL queries'
    ],
    'models/User.js': [
      'Refactor function to reduce cognitive complexity from 30 to 15',
      'Fix redundant assignment'
    ],
    'routes/approvals.js': [
      'Use optional chain expressions',
      'Remove useless assignments',
      'Remove unused variables'
    ],
    'routes/auth.js': [
      'Fix negated conditions'
    ],
    'routes/dashboard.js': [
      'Refactor to reduce cognitive complexity from 43 to 15',
      'Remove useless assignments',
      'Fix string concatenation issues'
    ],
    'routes/reimbursements.js': [
      'Refactor to reduce cognitive complexity from 58 to 15',
      'Fix parseFloat issues'
    ]
  }
};

fs.writeFileSync('fix-plan.json', JSON.stringify(fixPlan, null, 2));
console.log('Fix plan saved to fix-plan.json');
console.log('\nStarting fixes...\n');


