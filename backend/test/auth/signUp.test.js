import { jest } from "@jest/globals";

// ===== MOCK =====
jest.unstable_mockModule("../../src/models/User.js", () => ({
  default: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

jest.unstable_mockModule("bcrypt", () => ({
  default: {
    hash: jest.fn(),
  },
}));

// ===== IMPORT SAU MOCK =====
const { default: User } = await import("../../src/models/User.js");
const { default: bcrypt } = await import("bcrypt");
const { signUp } = await import("../../src/controllers/authController.js");

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
describe("signUp", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const validBody = {
    username: "testuser",
    password: "Test@123",
    email: "test@example.com",
    firstName: "Hung",
    lastName: "Nguyen",
  };

  // --- Happy path ---
  it("nên tạo user thành công và trả về 201", async () => {
    const req = mockReq({ body: validBody });
    const res = mockRes();

    User.findOne.mockResolvedValue(null); // không trùng
    bcrypt.hash.mockResolvedValue("hashed_password_123");
    User.create.mockResolvedValue({});

    await signUp(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: "Đăng ký thành công",
      status: "201",
    });
    expect(User.findOne).toHaveBeenCalledWith({
      $or: [{ username: "testuser" }, { email: "test@example.com" }],
    });
    expect(bcrypt.hash).toHaveBeenCalledWith("Test@123", 10);
    expect(User.create).toHaveBeenCalledWith({
      username: "testuser",
      hashedPassword: "hashed_password_123",
      email: "test@example.com",
      displayName: "Nguyen Hung",
    });
  });

  // --- Thiếu field ---
  it("nên trả 400 nếu thiếu username", async () => {
    const req = mockReq({
      body: { ...validBody, username: "" },
    });
    const res = mockRes();

    await signUp(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(User.findOne).not.toHaveBeenCalled();
  });

  it("nên trả 400 nếu thiếu password", async () => {
    const req = mockReq({
      body: { ...validBody, password: "" },
    });
    const res = mockRes();

    await signUp(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("nên trả 400 nếu thiếu email", async () => {
    const req = mockReq({
      body: { ...validBody, email: "" },
    });
    const res = mockRes();

    await signUp(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("nên trả 400 nếu thiếu firstName", async () => {
    const req = mockReq({
      body: { ...validBody, firstName: "" },
    });
    const res = mockRes();

    await signUp(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("nên trả 400 nếu thiếu lastName", async () => {
    const req = mockReq({
      body: { ...validBody, lastName: "" },
    });
    const res = mockRes();

    await signUp(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  // --- Username trùng ---
  it("nên trả 409 nếu username đã tồn tại", async () => {
    const req = mockReq({ body: validBody });
    const res = mockRes();

    User.findOne.mockResolvedValue({ _id: "existing_user", username: "testuser" });

    await signUp(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ message: "username đã tồn tại" });
    expect(bcrypt.hash).not.toHaveBeenCalled();
    expect(User.create).not.toHaveBeenCalled();
  });

  // --- Email trùng ---
  it("nên trả 409 nếu email đã tồn tại", async () => {
    const req = mockReq({ body: validBody });
    const res = mockRes();

    // username khác nhưng email trùng
    User.findOne.mockResolvedValue({ _id: "existing_user", username: "otheruser" });

    await signUp(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ message: "email đã tồn tại" });
    expect(bcrypt.hash).not.toHaveBeenCalled();
    expect(User.create).not.toHaveBeenCalled();
  });

  // --- Lỗi DB ---
  it("nên trả 500 nếu database lỗi", async () => {
    const req = mockReq({ body: validBody });
    const res = mockRes();

    User.findOne.mockRejectedValue(new Error("DB error"));

    await signUp(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Lỗi hệ thống" });
  });
});
