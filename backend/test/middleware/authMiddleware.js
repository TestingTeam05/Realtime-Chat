import authMiddleware from "../middleware/authMiddleware.js";

describe("Unit Test - authMiddleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {}, cookies: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it("Nên trả về lỗi 401 khi không gửi Token xác thực", async () => {
    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("Nên cho phép truy cập (gọi next) khi Token hợp lệ", async () => {
    req.headers.authorization = "Bearer valid_token_sample";

    await authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
