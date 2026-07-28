import { jest } from "@jest/globals";

// ===== MOCK =====
jest.unstable_mockModule("../../src/models/Session.js", () => ({
  default: {
    deleteOne: jest.fn(),
  },
}));

// ===== IMPORT SAU MOCK =====
const { default: Session } = await import("../../src/models/Session.js");
const { signOut } = await import("../../src/controllers/authController.js");

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
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
};

// ===== TESTS =====
describe("signOut", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- Happy path: có token ---
  it("nên xóa session, xóa cookie và trả 204", async () => {
    const req = mockReq({
      cookies: { refreshToken: "valid-refresh-token" },
    });
    const res = mockRes();

    Session.deleteOne.mockResolvedValue({ deletedCount: 1 });

    await signOut(req, res);

    expect(Session.deleteOne).toHaveBeenCalledWith({
      refreshToken: "valid-refresh-token",
    });
    expect(res.clearCookie).toHaveBeenCalledWith("refreshToken");
    expect(res.sendStatus).toHaveBeenCalledWith(204);
  });

  // --- Không có token ---
  it("nên trả 204 mà không gọi DB nếu không có token", async () => {
    const req = mockReq({ cookies: {} });
    const res = mockRes();

    await signOut(req, res);

    expect(Session.deleteOne).not.toHaveBeenCalled();
    expect(res.clearCookie).not.toHaveBeenCalled();
    expect(res.sendStatus).toHaveBeenCalledWith(204);
  });

  // --- Cookies undefined ---
  it("nên trả 204 nếu cookies là undefined", async () => {
    const req = mockReq({ cookies: undefined });
    const res = mockRes();

    await signOut(req, res);

    expect(Session.deleteOne).not.toHaveBeenCalled();
    expect(res.sendStatus).toHaveBeenCalledWith(204);
  });

  // --- Lỗi DB ---
  it("nên trả 500 nếu database lỗi", async () => {
    const req = mockReq({
      cookies: { refreshToken: "some-token" },
    });
    const res = mockRes();

    Session.deleteOne.mockRejectedValue(new Error("DB error"));

    await signOut(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Lỗi hệ thống" });
  });
});
