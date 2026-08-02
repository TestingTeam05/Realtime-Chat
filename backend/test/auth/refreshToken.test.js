import { jest } from "@jest/globals";

// ===== MOCK =====
jest.unstable_mockModule("../../src/models/Session.js", () => ({
  default: {
    findOne: jest.fn(),
  },
}));

jest.unstable_mockModule("jsonwebtoken", () => ({
  default: {
    sign: jest.fn(),
  },
}));

// ===== IMPORT SAU MOCK =====
const { default: Session } = await import("../../src/models/Session.js");
const { default: jwt } = await import("jsonwebtoken");
const { refreshToken } = await import(
  "../../src/controllers/authController.js"
);

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
  return res;
};

// ===== TESTS =====
describe("refreshToken", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ACCESS_TOKEN_SECRET = "test-secret";
  });

  // --- Happy path ---
  it("nên tạo access token mới và trả 200", async () => {
    const req = mockReq({
      cookies: { refreshToken: "valid-refresh-token" },
    });
    const res = mockRes();

    // Session hợp lệ, chưa hết hạn
    Session.findOne.mockResolvedValue({
      userId: "user123",
      refreshToken: "valid-refresh-token",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 ngày nữa
    });
    jwt.sign.mockReturnValue("new-access-token");

    await refreshToken(req, res);

    expect(Session.findOne).toHaveBeenCalledWith({
      refreshToken: "valid-refresh-token",
    });
    expect(jwt.sign).toHaveBeenCalledWith(
      { userId: "user123" },
      "test-secret",
      { expiresIn: "30m" }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ accessToken: "new-access-token" });
  });

  // --- Không có token ---
  it("nên trả 401 nếu không có refresh token trong cookie", async () => {
    const req = mockReq({ cookies: {} });
    const res = mockRes();

    await refreshToken(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Token không tồn tại.",
    });
    expect(Session.findOne).not.toHaveBeenCalled();
  });

  // --- Session không tồn tại ---
  it("nên trả 403 nếu session không tìm thấy", async () => {
    const req = mockReq({
      cookies: { refreshToken: "invalid-token" },
    });
    const res = mockRes();

    Session.findOne.mockResolvedValue(null);

    await refreshToken(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: "Token không hợp lệ hoặc đã hết hạn",
    });
  });

  // --- Token đã hết hạn ---
  it("nên trả 403 nếu token đã hết hạn", async () => {
    const req = mockReq({
      cookies: { refreshToken: "expired-token" },
    });
    const res = mockRes();

    Session.findOne.mockResolvedValue({
      userId: "user123",
      refreshToken: "expired-token",
      expiresAt: new Date(Date.now() - 1000), // đã hết hạn 1 giây trước
    });

    await refreshToken(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: "Token đã hết hạn.",
    });
    expect(jwt.sign).not.toHaveBeenCalled(); // không tạo token mới
  });

  // --- Lỗi DB ---
  it("nên trả 500 nếu database lỗi", async () => {
    const req = mockReq({
      cookies: { refreshToken: "some-token" },
    });
    const res = mockRes();

    Session.findOne.mockRejectedValue(new Error("DB error"));

    await refreshToken(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Lỗi hệ thống" });
  });
});
