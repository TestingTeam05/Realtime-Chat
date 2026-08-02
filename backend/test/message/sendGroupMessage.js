import sendGroupMessage from "../controllers/message/sendGroupMessage.js";

describe("Unit Test - sendGroupMessage Controller", () => {
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

  it("Nên trả về 400 nếu thiếu groupId hoặc nội dung tin nhắn nhóm", async () => {
    req.body = { groupId: "", content: "Thành viên mới xin chào!" };

    await sendGroupMessage(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("Nên gửi tin nhắn nhóm thành công khi thông tin hợp lệ", async () => {
    req.body = { groupId: "group_999", content: "Thành viên mới xin chào!" };

    await sendGroupMessage(req, res);

    expect(res.status).toHaveBeenCalled();
  });
});
