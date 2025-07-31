import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Starting development servers...');
console.log('📱 Frontend: http://localhost:5173');
console.log('🔧 Backend: http://localhost:3000');
console.log('');

// Start Express server
const expressServer = spawn('node', ['server/index.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

// Wait a moment for Express to start, then start Vite
setTimeout(() => {
  const viteServer = spawn('npm', ['run', 'dev:frontend'], {
    stdio: 'inherit',
    cwd: __dirname
  });

  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down servers...');
    expressServer.kill();
    viteServer.kill();
    process.exit(0);
  });

  viteServer.on('close', (code) => {
    console.log(`\n📱 Vite server exited with code ${code}`);
    expressServer.kill();
    process.exit(code);
  });
}, 2000);

expressServer.on('close', (code) => {
  console.log(`\n🔧 Express server exited with code ${code}`);
  process.exit(code);
}); 