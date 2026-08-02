import request from 'supertest';
import { app } from '../../src/socket/index.js';

describe('Unit Test: GET /api/conversations/:conversationId/messages (getMessages)', () => {
  test('Báo lỗi nếu conversationId không hợp lệ hoặc người dùng chưa đăng nhập', async () => {
    const res = await request(app)
      .get('/api/conversations/invalid-id-123/messages');

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });
});