import { execSync } from 'node:child_process';

interface ServiceConfig {
  name: string;
  port: number;
  required: boolean;
}

const SERVICES: ServiceConfig[] = [
  { name: 'users', port: 3001, required: true },
  { name: 'documents', port: 3002, required: true },
  { name: 'knowledge', port: 3003, required: true },
  { name: 'region', port: 3004, required: true },
  { name: 'api', port: 3000, required: false }, // API Gateway is optional for some tests
];

async function checkService(service: ServiceConfig): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:${service.port}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

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

  // Verify backend services are running
  const maxWait = 60000; // 60 seconds
  const startTime = Date.now();
  const requiredServices = SERVICES.filter((s) => s.required);

  while (Date.now() - startTime < maxWait) {
    const serviceStatuses = await Promise.all(
      requiredServices.map(async (service) => ({
        ...service,
        ready: await checkService(service),
      })),
    );

    const allReady = serviceStatuses.every((s) => s.ready);

    if (allReady) {
      for (const service of serviceStatuses) {
        console.log(`✓ ${service.name} service ready (port ${service.port})`);
      }

      // Check optional services for informational purposes
      for (const service of SERVICES.filter((s) => !s.required)) {
        const ready = await checkService(service);
        if (ready) {
          console.log(`✓ ${service.name} service ready (port ${service.port})`);
        } else {
          console.log(
            `○ ${service.name} service not running (port ${service.port}) - optional`,
          );
        }
      }

      return;
    }

    // Show progress
    const readyCount = serviceStatuses.filter((s) => s.ready).length;
    const notReady = serviceStatuses
      .filter((s) => !s.ready)
      .map((s) => s.name)
      .join(', ');
    console.log(
      `Waiting for services... (${readyCount}/${requiredServices.length} ready, waiting for: ${notReady})`,
    );

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // Timeout - show which services are missing
  const finalStatuses = await Promise.all(
    requiredServices.map(async (service) => ({
      ...service,
      ready: await checkService(service),
    })),
  );

  const missing = finalStatuses.filter((s) => !s.ready);
  const missingList = missing
    .map((s) => `  - ${s.name} (port ${s.port})`)
    .join('\n');

  throw new Error(
    `Backend services not running. Missing services:\n${missingList}\n\n` +
      'To start all services:\n' +
      '  cd apps/backend && pnpm start\n\n' +
      'Or start individual services:\n' +
      '  pnpm start:users    # port 3001\n' +
      '  pnpm start:documents # port 3002\n' +
      '  pnpm start:knowledge # port 3003\n' +
      '  pnpm start:region    # port 3004',
  );
}
