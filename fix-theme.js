import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const replacements = [
  { regex: /bg-base-100/g, replacement: 'bg-background' },
  { regex: /bg-base-200/g, replacement: 'bg-secondary' },
  { regex: /bg-base-300/g, replacement: 'bg-muted' },
  { regex: /text-base-content\/[0-9]+/g, replacement: 'text-muted-foreground' },
  { regex: /text-base-content/g, replacement: 'text-foreground' },
  { regex: /border-base-[1-3]00/g, replacement: 'border-border' },
  { regex: /bg-gray-[1-9]00/g, replacement: 'bg-secondary' },
  { regex: /bg-neutral-[1-9]00/g, replacement: 'bg-secondary' },
  { regex: /text-gray-[1-9]00/g, replacement: 'text-foreground' },
  { regex: /text-neutral-[1-9]00/g, replacement: 'text-foreground' },
  { regex: /border-gray-[1-9]00/g, replacement: 'border-border' },
  { regex: /border-neutral-[1-9]00/g, replacement: 'border-border' },
  // Be careful with bg-white, only replacing common patterns
  { regex: /bg-white\/[0-9]+/g, replacement: 'bg-card' },
  { regex: /text-white\/[0-9]+/g, replacement: 'text-foreground' },
  { regex: /bg-white/g, replacement: 'bg-card text-card-foreground' },
  { regex: /text-white/g, replacement: 'text-primary-foreground' },
];

walkDir('./client/src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    // Manual overrides for some files
    if (filePath.includes('Dashboard.tsx')) {
        content = content.replace(/bg-gradient-to-br from-base-100 via-base-200 to-base-300/g, 'bg-background');
        content = content.replace(/<DashboardBackground \/>/g, ''); // Remove distracting 3D background
    }
    
    for (const r of replacements) {
      content = content.replace(r.regex, r.replacement);
    }
    
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${filePath}`);
    }
  }
});
