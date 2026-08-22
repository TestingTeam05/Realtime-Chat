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

const { socketAuthMiddleware } = await import("../../src/middlewares/socketMiddleware.js");

describe("socketAuthMiddleware", () => {
  let socket, next;

  beforeEach(() => {
    jest.clearAllMocks();
    socket = { handshake: { auth: {} } };
    next = jest.fn();
    mockQuery.mockResult = null;
    process.env.ACCESS_TOKEN_SECRET = "secret";
  });

  it("Nên gọi next với Error nếu không có token", async () => {
    await socketAuthMiddleware(socket, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(next.mock.calls[0][0].message).toBe("Unauthorized - Token không tồn tại");
  });

  it("Nên gọi next với Error nếu token không hợp lệ", async () => {
    socket.handshake.auth.token = "invalid";
    mockVerify.mockReturnValue(null);

    await socketAuthMiddleware(socket, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(next.mock.calls[0][0].message).toBe("Unauthorized - Token không hợp lệ hoặc đã hết hạn");
  });

  it("Nên gọi next với Error nếu user không tồn tại", async () => {
    socket.handshake.auth.token = "valid";
    mockVerify.mockReturnValue({ userId: "user_1" });
    mockQuery.mockResult = null;

    await socketAuthMiddleware(socket, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(next.mock.calls[0][0].message).toBe("User không tồn tại");
  });

  it("Nên gọi next và gán socket.user nếu thành công", async () => {
    socket.handshake.auth.token = "valid";
    mockVerify.mockReturnValue({ userId: "user_1" });
    const fakeUser = { _id: "user_1", username: "test" };
    mockQuery.mockResult = fakeUser;

    await socketAuthMiddleware(socket, next);

    expect(socket.user).toEqual(fakeUser);
    expect(next).toHaveBeenCalledWith(); // called with no args
  });

  it("Nên bắt exception và gọi next với Error(Unauthorized)", async () => {
    socket.handshake.auth.token = "valid";
    mockVerify.mockImplementation(() => {
      throw new Error("JWT Error");
    });

    await socketAuthMiddleware(socket, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(next.mock.calls[0][0].message).toBe("Unauthorized");
  });
});
