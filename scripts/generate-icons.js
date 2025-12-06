const fs = require('fs');
const path = require('path');

// Create simple placeholder icons (base64 encoded 1x1 orange pixel)
const createPlaceholderIcon = (size) => {
    const canvas = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" rx="${size / 8}" fill="#f47521"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${size / 3}" fill="#000000"/>
    <path d="M${size / 2.5} ${size / 3} L${size / 2.5} ${size * 2 / 3} L${size * 2 / 3} ${size / 2} Z" fill="#f47521"/>
  </svg>`;

    fs.writeFileSync(
        path.join(__dirname, 'public', 'icons', `icon${size}.svg`),
        canvas
    );
    console.log(`Created icon${size}.svg`);
};

// Create icons for required sizes
[16, 48, 128].forEach(createPlaceholderIcon);

console.log('✓ Icons created successfully');
