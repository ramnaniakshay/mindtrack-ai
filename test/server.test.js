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
    const res = await request(app).get('/api/moods');
    expect(res.statusCode).toEqual(200);
    expect(res.body[0].mood).toEqual('Calm');
  });

  test('POST /api/moods should successfully insert mood', async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: 1, mood: 'Stressed', energy: 4, stress: 7, tags: ['mock'] }] });
    const res = await request(app)
      .post('/api/moods')
      .send({ mood: 'Stressed', energy: 4, stress: 7, tags: ['mock'] });
    expect(res.statusCode).toEqual(201);
    expect(res.body.mood).toEqual('Stressed');
  });

  test('POST /api/journals should block suicidal content', async () => {
    const res = await request(app)
      .post('/api/journals')
      .send({ title: 'Tough day', content: 'I want to end my life now.' });
    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toContain('Safety concerns');
    expect(res.body.safety.safe).toBe(false);
  });

  test('POST /api/chat should intercept crisis terms gracefully', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const res = await request(app)
      .post('/api/chat')
      .send({ message: 'I am planning to suicide.' });
    expect(res.statusCode).toEqual(200);
    expect(res.body.reply).toContain('crisis');
    expect(res.body.safety.safe).toBe(false);
  });
});
