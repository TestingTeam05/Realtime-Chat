import request from 'supertest';
import { app } from '../../src/socket/index.js';

describe('Unit Test: PATCH /api/conversations/:conversationId/seen (markAsSeen)', () => {
  test('Từ chối đánh dấu đã đọc khi không có quyền/chưa xác thực', async () => {
    const res = await request(app)
      .patch('/api/conversations/65123456789abcdef1234567/seen');

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });
});