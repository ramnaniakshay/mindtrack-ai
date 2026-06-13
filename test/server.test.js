import { jest, describe, test, expect, beforeEach, beforeAll } from '@jest/globals';
import request from 'supertest';

// Define the query mock globally so the tests can access it
const mockQuery = jest.fn();

// Use unstable_mockModule for ESM local file mocking
jest.unstable_mockModule('../db.js', () => {
  return {
    getPool: () => ({
      query: mockQuery,
      connect: () => Promise.resolve({
        query: mockQuery,
        release: () => {}
      })
    }),
    runMigrations: () => Promise.resolve()
  };
});

let app;

describe('Express REST API Endpoints', () => {
  beforeAll(async () => {
    // Dynamic import to ensure mock is registered first under ESM
    const serverModule = await import('../server.js');
    app = serverModule.default;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockResolvedValue({ rows: [] });
  });

  test('GET /health should return 200 and healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body.status).toEqual('healthy');
  });

  test('GET /api/moods should return list of moods', async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: 1, mood: 'Calm', energy: 8, stress: 2, tags: ['focus'] }] });
    const res = await request(app).get('/api/moods').set('Authorization', 'Bearer test_user_id').set('Authorization', 'Bearer test_user_id');
    expect(res.statusCode).toEqual(200);
    expect(res.body[0].mood).toEqual('Calm');
  });

  test('POST /api/moods should successfully insert mood', async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: 1, mood: 'Stressed', energy: 4, stress: 7, tags: ['mock'] }] });
    const res = await request(app).post('/api/moods').set('Authorization', 'Bearer test_user_id')
      .send({ mood: 'Stressed', energy: 4, stress: 7, tags: ['mock'] });
    expect(res.statusCode).toEqual(201);
    expect(res.body.mood).toEqual('Stressed');
  });

  test('POST /api/journals should block suicidal content', async () => {
    const res = await request(app).post('/api/journals').set('Authorization', 'Bearer test_user_id')
      .send({ title: 'Tough day', content: 'I want to end my life now.' });
    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toContain('Safety concerns');
    expect(res.body.safety.safe).toBe(false);
  });

  test('POST /api/chat should intercept crisis terms gracefully', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const res = await request(app).post('/api/chat').set('Authorization', 'Bearer test_user_id')
      .send({ message: 'I am planning to suicide.' });
    expect(res.statusCode).toEqual(200);
    expect(res.body.reply).toContain('crisis');
    expect(res.body.safety.safe).toBe(false);
  });

  describe('Input Validation Failures (boundary/type checks)', () => {
    test('POST /api/settings fails with 400 on empty or invalid key', async () => {
      const res = await request(app).post('/api/settings').set('Authorization', 'Bearer test_user_id').set('Authorization', 'Bearer test_user_id').send({ key: '', value: {} });
      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toContain('key must be a non-empty string');
    });

    test('POST /api/settings fails with 400 on key exceeding 100 characters', async () => {
      const longKey = 'a'.repeat(101);
      const res = await request(app).post('/api/settings').set('Authorization', 'Bearer test_user_id').set('Authorization', 'Bearer test_user_id').send({ key: longKey, value: {} });
      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toContain('key cannot exceed 100 characters');
    });

    test('POST /api/settings fails with 400 on missing value', async () => {
      const res = await request(app).post('/api/settings').set('Authorization', 'Bearer test_user_id').set('Authorization', 'Bearer test_user_id').send({ key: 'theme' });
      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toContain('value is required');
    });

    test('POST /api/moods fails with 400 on invalid or out-of-range energy/stress', async () => {
      let res = await request(app).post('/api/moods').set('Authorization', 'Bearer test_user_id').set('Authorization', 'Bearer test_user_id').send({ mood: 'Stressed', energy: 11, stress: 5 });
      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toContain('energy must be an integer');

      res = await request(app).post('/api/moods').set('Authorization', 'Bearer test_user_id').set('Authorization', 'Bearer test_user_id').send({ mood: 'Stressed', energy: 5, stress: 0 });
      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toContain('stress must be an integer');

      res = await request(app).post('/api/moods').set('Authorization', 'Bearer test_user_id').set('Authorization', 'Bearer test_user_id').send({ mood: 'Stressed', energy: 'high', stress: 5 });
      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toContain('energy must be an integer');
    });

    test('POST /api/moods fails with 400 on invalid tags type', async () => {
      const res = await request(app).post('/api/moods').set('Authorization', 'Bearer test_user_id').set('Authorization', 'Bearer test_user_id').send({ mood: 'Stressed', energy: 5, stress: 5, tags: 'not-an-array' });
      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toContain('tags must be an array');
    });

    test('POST /api/journals fails with 400 on empty content', async () => {
      const res = await request(app).post('/api/journals').set('Authorization', 'Bearer test_user_id').set('Authorization', 'Bearer test_user_id').send({ title: 'JEE stress', content: ' ' });
      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toContain('content must be a non-empty string');
    });

    test('DELETE /api/journals/:id fails with 400 on non-integer id', async () => {
      const res = await request(app).delete('/api/journals/abc').set('Authorization', 'Bearer test_user_id').set('Authorization', 'Bearer test_user_id');
      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toContain('id must be a valid positive integer');
    });
  });

  describe('Database query 500 Error Paths', () => {
    test('GET /api/settings returns 500 on db query failure', async () => {
      mockQuery.mockRejectedValue(new Error('DB Query Timeout'));
      const res = await request(app).get('/api/settings').set('Authorization', 'Bearer test_user_id').set('Authorization', 'Bearer test_user_id');
      expect(res.statusCode).toEqual(500);
      expect(res.body.error).toContain('Failed to retrieve settings');
    });

    test('GET /api/moods returns 500 on db query failure', async () => {
      mockQuery.mockRejectedValue(new Error('Connection lost'));
      const res = await request(app).get('/api/moods').set('Authorization', 'Bearer test_user_id').set('Authorization', 'Bearer test_user_id');
      expect(res.statusCode).toEqual(500);
      expect(res.body.error).toContain('Failed to fetch mood logs');
    });

    test('GET /api/journals returns 500 on db query failure', async () => {
      mockQuery.mockRejectedValue(new Error('Connection lost'));
      const res = await request(app).get('/api/journals').set('Authorization', 'Bearer test_user_id').set('Authorization', 'Bearer test_user_id');
      expect(res.statusCode).toEqual(500);
      expect(res.body.error).toContain('Failed to fetch journals');
    });

    test('POST /api/moods returns 500 on db insert failure', async () => {
      mockQuery.mockRejectedValue(new Error('Insert lock conflict'));
      const res = await request(app).post('/api/moods').set('Authorization', 'Bearer test_user_id').set('Authorization', 'Bearer test_user_id').send({ mood: 'Calm', energy: 8, stress: 2 });
      expect(res.statusCode).toEqual(500);
      expect(res.body.error).toContain('Failed to log mood');
    });
  });
});
