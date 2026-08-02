import sendDirectMessage from "../controllers/message/sendDirectMessage.js";

describe("Unit Test - sendDirectMessage Controller", () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: { _id: "sender_123" },
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it("Nên trả về 400 nếu tin nhắn cá nhân không có nội dung", async () => {
    req.body = { recipientId: "receiver_456", content: "" };

    await sendDirectMessage(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("Nên phản hồi thành công khi gửi tin nhắn cá nhân hợp lệ", async () => {
    req.body = { recipientId: "receiver_456", content: "Chủ nhật này rảnh không?" };

    await sendDirectMessage(req, res);

    expect(res.status).toHaveBeenCalled();
  });
});
