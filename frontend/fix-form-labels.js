// Fix all form labels to have htmlFor and id attributes
const fs = require('node:fs');
const path = require('node:path');

const files = [
  'src/pages/ManageCostCenters.jsx',
  'src/pages/ManageDepartments.jsx',
  'src/pages/ManageProjects.jsx'
];

files.forEach(filePath => {
  const fullPath = path.join(__dirname, filePath);
  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;
  
  // Fix form labels - add htmlFor and id
  const labelInputPairs = [
    { label: 'Name', id: 'name', type: 'input' },
    { label: 'Code', id: 'code', type: 'input' },
    { label: 'Description', id: 'description', type: 'textarea' },
    { label: 'Status', id: 'status', type: 'select' },
    { label: 'Start Date', id: 'start_date', type: 'input' },
    { label: 'End Date', id: 'end_date', type: 'input' },
    { label: 'Department', id: 'department_id', type: 'select' }
  ];
  
  labelInputPairs.forEach(({ label, id, type }) => {
    // Fix label
    const labelRegex = new RegExp(`(<label className="text-xs font-medium text-gray-700 mb-0\\.5 block">\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^<]*</label>\\s*<${type}[^>]*)`, 'g');
    if (labelRegex.test(content)) {
      content = content.replace(
        new RegExp(`(<label className="text-xs font-medium text-gray-700 mb-0\\.5 block">\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^<]*</label>\\s*<${type}[^>]*)`, 'g'),
        `<label htmlFor="${id}" className="text-xs font-medium text-gray-700 mb-0.5 block">${label}<span className="text-red-500">*</span></label>\n                <${type}\n                  id="${id}"`
      );
      modified = true;
    }
  });
  
  // Fix filter labels
  content = content.replace(
    /<label className="block text-\[9px\] font-medium text-gray-600 mb-2">Status \(Multiple Select\)<\/label>/g,
    '<label htmlFor="status-filter" className="block text-[9px] font-medium text-gray-600 mb-2">Status (Multiple Select)</label>'
  );
  content = content.replace(
    /<label className="block text-\[9px\] font-medium text-gray-600 mb-2">Date Range<\/label>/g,
    '<label htmlFor="date-range-filter" className="block text-[9px] font-medium text-gray-600 mb-2">Date Range</label>'
  );
  
  if (modified) {
    fs.writeFileSync(fullPath, content);
    console.log(`Fixed labels in ${filePath}`);
  }
});

console.log('Done fixing form labels!');


