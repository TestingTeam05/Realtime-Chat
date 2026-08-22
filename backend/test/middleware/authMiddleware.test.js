import { jest } from "@jest/globals";

const mockVerify = jest.fn();
jest.unstable_mockModule("jsonwebtoken", () => ({
  default: {
    verify: mockVerify,
  },
}));

const mockQuery = {
  select: jest.fn().mockReturnThis(),
};
mockQuery.then = function(resolve) { resolve(this.mockResult); };

const mockFindById = jest.fn().mockReturnValue(mockQuery);

jest.unstable_mockModule("../../src/models/User.js", () => ({
  default: {
    findById: mockFindById,
  },
}));

const { protectedRoute } = await import("../../src/middlewares/authMiddleware.js");

describe("authMiddleware - protectedRoute", () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    mockQuery.mockResult = null;
    process.env.ACCESS_TOKEN_SECRET = "secret";
  });

  it("Nên trả về 401 khi không có token", () => {
    protectedRoute(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Không tìm thấy access token" });
    expect(next).not.toHaveBeenCalled();
  });

  it("Nên trả về 403 khi token không hợp lệ", () => {
    req.headers["authorization"] = "Bearer invalid_token";
    mockVerify.mockImplementation((token, secret, callback) => {
      callback(new Error("Invalid token"), null);
    });

    protectedRoute(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Access token hết hạn hoặc không đúng" });
  });

  it("Nên trả về 404 khi user không tồn tại", async () => {
    req.headers["authorization"] = "Bearer valid_token";
    mockVerify.mockImplementation((token, secret, callback) => {
      callback(null, { userId: "user_1" });
    });
    mockQuery.mockResult = null; // user không tồn tại

    await protectedRoute(req, res, next);
    
    // JWT verify callback in protectedRoute is async
    await new Promise(process.nextTick); 

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "người dùng không tồn tại." });
  });

  it("Nên gọi next() và gán req.user khi token hợp lệ", async () => {
    req.headers["authorization"] = "Bearer valid_token";
    mockVerify.mockImplementation((token, secret, callback) => {
      callback(null, { userId: "user_1" });
    });
    const fakeUser = { _id: "user_1", username: "test" };
    mockQuery.mockResult = fakeUser;

    await protectedRoute(req, res, next);
    
    // Wait for the async callback in protectedRoute
    await new Promise(process.nextTick);

    expect(req.user).toEqual(fakeUser);
    expect(next).toHaveBeenCalled();
  });
});
