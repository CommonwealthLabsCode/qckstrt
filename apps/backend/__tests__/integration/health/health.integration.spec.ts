import { BASE_URL } from '../utils';

describe('Health Check (Integration)', () => {
  describe('GET /health', () => {
    it('should return healthy status with all indicators', async () => {
      const response = await fetch(`${BASE_URL}/health`);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.status).toBe('ok');
      expect(body.info).toBeDefined();
      expect(body.info.service).toBeDefined();
      expect(body.info.service.status).toBe('up');
      expect(body.info.service.name).toBe('users-service');
    });
  });

  describe('GET /health/live', () => {
    it('should return liveness status', async () => {
      const response = await fetch(`${BASE_URL}/health/live`);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.status).toBe('ok');
      expect(body.info.app.status).toBe('up');
    });
  });

  describe('GET /health/ready', () => {
    it('should return readiness status with database check', async () => {
      const response = await fetch(`${BASE_URL}/health/ready`);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.status).toBe('ok');
      expect(body.info.database).toBeDefined();
      expect(body.info.database.status).toBe('up');
    });
  });
});
