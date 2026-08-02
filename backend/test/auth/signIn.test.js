import { jest } from "@jest/globals";

// ===== MOCK =====
jest.unstable_mockModule("../../src/models/User.js", () => ({
  default: {
    findOne: jest.fn(),
  },
}));

jest.unstable_mockModule("../../src/models/Session.js", () => ({
  default: {
    create: jest.fn(),
  },
}));

jest.unstable_mockModule("bcrypt", () => ({
  default: {
    compare: jest.fn(),
  },
}));

jest.unstable_mockModule("jsonwebtoken", () => ({
  default: {
    sign: jest.fn(),
  },
}));

// ===== IMPORT SAU MOCK =====
const { default: User } = await import("../../src/models/User.js");
const { default: Session } = await import("../../src/models/Session.js");
const { default: bcrypt } = await import("bcrypt");
const { default: jwt } = await import("jsonwebtoken");
const { signIn } = await import("../../src/controllers/authController.js");

// ===== HELPERS =====
const mockReq = (overrides = {}) => ({
  body: {},
  params: {},
  query: {},
  cookies: {},
  user: null,
  ...overrides,
});

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.sendStatus = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  return res;
};

// ===== TESTS =====
describe("signIn", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ACCESS_TOKEN_SECRET = "test-secret";
  });

  const mockUser = {
    _id: "user123",
    username: "testuser",
    hashedPassword: "hashed_pw",
    displayName: "Nguyen Hung",
  };

  // --- Happy path ---
  it("nên đăng nhập thành công và trả về accessToken + cookie", async () => {
    const req = mockReq({
      body: { username: "testuser", password: "Test@123" },
    });
    const res = mockRes();

    User.findOne.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue("mock-access-token");
    Session.create.mockResolvedValue({});

    await signIn(req, res);

    // Kiểm tra response
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "User Nguyen Hung đã logged in!",
      accessToken: "mock-access-token",
    });

    // Kiểm tra JWT được tạo đúng
    expect(jwt.sign).toHaveBeenCalledWith(
      { userId: "user123" },
      "test-secret",
      { expiresIn: "30m" }
    );

    // Kiểm tra cookie được set
    expect(res.cookie).toHaveBeenCalledWith(
      "refreshToken",
      expect.any(String),
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: "none",
      })
    );

    // Kiểm tra session được tạo
    expect(Session.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user123",
        refreshToken: expect.any(String),
        expiresAt: expect.any(Date),
      })
    );
  });

  // --- Thiếu field ---
  it("nên trả 400 nếu thiếu username", async () => {
    const req = mockReq({
      body: { password: "Test@123" },
    });
    const res = mockRes();

    await signIn(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Thiếu username hoặc password.",
    });
    expect(User.findOne).not.toHaveBeenCalled();
  });

  it("nên trả 400 nếu thiếu password", async () => {
    const req = mockReq({
      body: { username: "testuser" },
    });
    const res = mockRes();

    await signIn(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  // --- User không tồn tại ---
  it("nên trả 401 nếu user không tồn tại", async () => {
    const req = mockReq({
      body: { username: "nouser", password: "Test@123" },
    });
    const res = mockRes();

    User.findOne.mockResolvedValue(null);

    await signIn(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "username hoặc password không chính xác",
    });
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  // --- Sai password ---
  it("nên trả 401 nếu password sai", async () => {
    const req = mockReq({
      body: { username: "testuser", password: "wrong_pw" },
    });
    const res = mockRes();

    User.findOne.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(false); // password sai

    await signIn(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "username hoặc password không chính xác",
    });
    expect(jwt.sign).not.toHaveBeenCalled(); // không tạo token
  });

  // --- Lỗi DB ---
  it("nên trả 500 nếu database lỗi", async () => {
    const req = mockReq({
      body: { username: "testuser", password: "Test@123" },
    });
    const res = mockRes();

    User.findOne.mockRejectedValue(new Error("DB error"));

    await signIn(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Lỗi hệ thống" });
  });
});
