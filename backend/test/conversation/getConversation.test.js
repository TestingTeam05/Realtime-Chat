import request from 'supertest';
import { app } from '../../src/socket/index.js';

describe('Unit Test: GET /api/conversations (getConversations)', () => {
  test('Chặn truy cập nếu chưa đăng nhập (protectedRoute hoạt động)', async () => {
    const res = await request(app)
      .get('/api/conversations');

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });
});