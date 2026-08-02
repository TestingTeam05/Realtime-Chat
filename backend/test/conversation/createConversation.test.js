import request from 'supertest';
import { app } from '../../src/socket/index.js';
describe('Unit Test: POST /api/conversations (createConversation)', () => {
  test('Trả về lỗi (401/400) khi truy cập mà chưa đăng nhập (thiếu token/cookie)', async () => {
    const res = await request(app)
      .post('/api/conversations')
      .send({ receiverId: '65123456789abcdef1234567' });

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  test('Trả về lỗi khi không gửi dữ liệu receiverId trong body', async () => {
    const res = await request(app)
      .post('/api/conversations')
      .send({}); // Body rỗng

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });
});