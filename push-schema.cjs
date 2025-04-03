// Simple CommonJS script to run the drizzle-kit push command
const { execSync } = require('child_process');

async function main() {
  console.log('Pushing schema changes...');
  
  try {
    // Execute the drizzle-kit push command
    execSync('npx drizzle-kit push:pg', { stdio: 'inherit' });
    console.log('Schema changes pushed successfully!');
  } catch (error) {
    console.error('Error pushing schema changes:', error);
    process.exit(1);
  }
}

main().catch(console.error);