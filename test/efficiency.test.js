import request from 'supertest';
import express from 'express';
import compression from 'compression';

const app = express();
app.use(compression());
app.use(express.json());

// Dummy endpoint to test compression payload
app.get('/api/heavy-data', (req, res) => {
  const bigArray = Array.from({ length: 1000 }, (_, i) => ({ id: i, text: "Some repeatable string to compress very well" }));
  res.json(bigArray);
});

describe('Efficiency and Performance Tests', () => {
  test('Responses should be GZIP compressed when Accept-Encoding is set', async () => {
    const res = await request(app).get('/api/heavy-data').set('Authorization', 'Bearer test_user_id')
      .set('Accept-Encoding', 'gzip');

    expect(res.headers['content-encoding']).toBe('gzip');
    expect(res.status).toBe(200);
  });

  test('Responses should not be compressed if Accept-Encoding does not allow it', async () => {
    const res = await request(app).get('/api/heavy-data').set('Authorization', 'Bearer test_user_id')
      .set('Accept-Encoding', 'identity');

    expect(res.headers['content-encoding']).toBeUndefined();
    expect(res.status).toBe(200);
  });
  
  test('Concurrent requests should not block each other', async () => {
    const requests = [];
    for (let i = 0; i < 50; i++) {
      requests.push(request(app).get('/api/heavy-data').set('Authorization', 'Bearer test_user_id').set('Authorization', 'Bearer test_user_id'));
    }
    
    const startTime = Date.now();
    const responses = await Promise.all(requests);
    const duration = Date.now() - startTime;
    
    // Express should handle 50 concurrent requests easily in under a second
    expect(duration).toBeLessThan(1500);
    responses.forEach(res => {
      expect(res.status).toBe(200);
    });
  });
});
