const fs = require('fs');

function removeDemoAccessScreen(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace the function implementation with a window.location.href redirect
    const demoAccessRegex = /function DemoAccessScreen\([^\)]*\)\s*{[^}]*return\s*\(\s*<div[^>]*>.*?<\/div>\s*\);\s*}/s;
    
    content = content.replace(demoAccessRegex, `function DemoAccessScreen({ target }: { target: string }) {
  // Return early if no user - we just redirect to the main marketing site
  if (typeof window !== "undefined") {
    window.location.href = "https://mirai-edu.space";
  }
  return null;
}`);

    fs.writeFileSync(filePath, content, 'utf8');
}

removeDemoAccessScreen('frontend/src/router/index.tsx');
removeDemoAccessScreen('frontend/src/router/lms-router.tsx');
