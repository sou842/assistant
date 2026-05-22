import * as fs from 'fs';
import * as path from 'path';

const searchDirs = ['./app', './components'];

const replacements = [
  // Backgrounds
  { regex: /bg-\[#000000\]/g, replacement: 'bg-app-canvas' },
  { regex: /bg-black/g, replacement: 'bg-app-canvas' },
  { regex: /bg-\[#0[Aa]0[Aa]0[Aa]\]/g, replacement: 'bg-app-surface' },
  { regex: /bg-\[#0[Ff]0[Ff]0[Ff]\]/g, replacement: 'bg-app-surface-elevated' },
  { regex: /bg-\[#111111\]/g, replacement: 'bg-app-surface-hover' },
  
  // Text Colors
  { regex: /text-white\/90/g, replacement: 'text-app-text-secondary' },
  { regex: /text-white\/80/g, replacement: 'text-app-text-secondary' },
  { regex: /text-white\/70/g, replacement: 'text-app-text-soft' },
  { regex: /text-white\/60/g, replacement: 'text-app-text-soft' },
  { regex: /text-white\/50/g, replacement: 'text-app-text-soft' },
  { regex: /text-white\/40/g, replacement: 'text-app-text-muted' },
  { regex: /text-white\/30/g, replacement: 'text-app-text-muted' },
  { regex: /text-white\/20/g, replacement: 'text-app-text-faint' },
  { regex: /text-white\/10/g, replacement: 'text-app-text-ghost' },
  { regex: /text-white\/5/g, replacement: 'text-app-text-ghost' },
  // Ensure text-white is replaced when it's just 'text-white' not followed by a slash
  { regex: /text-white(?!\/)/g, replacement: 'text-app-text-primary' },
  
  // Surfaces and Glass
  { regex: /bg-white\/10/g, replacement: 'bg-app-surface-glass-strong' },
  { regex: /bg-white\/5/g, replacement: 'bg-app-surface-glass' },
  { regex: /bg-white\/\[0\.02\]/g, replacement: 'bg-app-surface-glass-soft' },
  
  // Borders
  { regex: /border-\[#111\]/g, replacement: 'border-app-border-default' },
  { regex: /border-\[#222\]/g, replacement: 'border-app-border-strong' },
  { regex: /border-white\/20/g, replacement: 'border-app-border-strong' },
  { regex: /border-white\/10/g, replacement: 'border-app-border-default' },
  { regex: /border-white\/5/g, replacement: 'border-app-border-subtle' },
];

function processDirectory(directory) {
  const files = fs.readdirSync(directory);

  for (const file of files) {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;

      // Skip the sidebar component as it was already fixed
      if (fullPath.includes('components/ai/sidebar.tsx')) continue;

      for (const { regex, replacement } of replacements) {
        if (regex.test(content)) {
          content = content.replace(regex, replacement);
          modified = true;
        }
      }

      if (modified) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated: ${fullPath}`);
      }
    }
  }
}

searchDirs.forEach((dir) => {
  if (fs.existsSync(dir)) {
    processDirectory(dir);
  }
});
console.log("Replacement complete.");
