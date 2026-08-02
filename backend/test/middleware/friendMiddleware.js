import friendMiddleware from "../middleware/friendMiddleware.js";

describe("Unit Test - friendMiddleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: { _id: "user_A", friends: ["user_B"] },
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it("Nên chặn request nếu hai người dùng chưa phải là bạn bè", async () => {
    req.body = { recipientId: "user_C" };

    await friendMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("Nên cho phép gửi tin nhắn nếu hai người dùng đã là bạn bè", async () => {
    req.body = { recipientId: "user_B" };

    await friendMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
