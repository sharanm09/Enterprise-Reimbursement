// Script to add PropTypes to all React components
const fs = require('node:fs');
const path = require('node:path');

const pagesDir = path.join(__dirname, 'src', 'pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.jsx'));

const userPropType = `PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    displayName: PropTypes.string,
    email: PropTypes.string,
    role: PropTypes.shape({
      name: PropTypes.string,
      displayName: PropTypes.string
    })
  })`;

files.forEach(file => {
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if PropTypes already imported
  if (!content.includes('PropTypes')) {
    // Add import
    if (content.includes("import React")) {
      content = content.replace(
        /import React(.*?)from 'react';/,
        "import React$1from 'react';\nimport PropTypes from 'prop-types';"
      );
    }
    
    // Find component name and props
    const componentMatch = content.match(/const (\w+) = \(\s*\{\s*([^}]+)\s*\}\s*\)/);
    if (componentMatch) {
      const componentName = componentMatch[1];
      const props = componentMatch[2].split(',').map(p => p.trim()).filter(p => p);
      
      // Find export
      const exportMatch = content.match(/export default (\w+);/);
      if (exportMatch) {
        let propTypesCode = `\n${componentName}.propTypes = {\n`;
        props.forEach(prop => {
          if (prop === 'user') {
            propTypesCode += `  user: ${userPropType},\n`;
          } else if (prop === 'title') {
            propTypesCode += `  title: PropTypes.string.isRequired,\n`;
          } else if (prop === 'icon') {
            propTypesCode += `  icon: PropTypes.string.isRequired,\n`;
          } else {
            propTypesCode += `  ${prop}: PropTypes.any,\n`;
          }
        });
        propTypesCode += '};\n';
        
        content = content.replace(/export default (\w+);/, propTypesCode + '\nexport default $1;');
        fs.writeFileSync(filePath, content);
        console.log(`Added PropTypes to ${file}`);
      }
    }
  }
});

console.log('Done!');


