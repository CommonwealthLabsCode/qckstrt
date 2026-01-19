import { execSync } from 'node:child_process';

export default async function globalSetup() {
  // Verify docker-compose services are running
  try {
    execSync('docker compose ps --status running | grep supabase-db', {
      stdio: 'pipe',
    });
  } catch {
    throw new Error(
      'Integration tests require docker-compose services.\n' +
        'Run: docker compose up -d',
    );
  }

  console.log('✓ Docker services running');

  // Verify backend server is running
  const maxWait = 30000; // 30 seconds
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    try {
      const response = await fetch('http://localhost:3001/health');
      if (response.ok) {
        console.log('✓ Backend server ready');
        return;
      }
    } catch {
      // Server not ready yet, wait and retry
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(
    'Backend server not running on port 3001.\n' +
      'Run: PORT=3001 pnpm --filter backend start:dev',
  );
}
