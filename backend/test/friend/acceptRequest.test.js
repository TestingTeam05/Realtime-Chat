import request from "supertest";
import express from "express";
import { jest } from "@jest/globals";

const FriendRequestMock = {
  findById: jest.fn(),
  findByIdAndDelete: jest.fn(),
};

const FriendMock = {
  create: jest.fn(),
};

const UserMock = {
  findById: jest.fn(),
};

jest.unstable_mockModule("../../src/models/FriendRequest.js", () => ({
  default: FriendRequestMock,
}));
jest.unstable_mockModule("../../src/models/Friend.js" , () => ({
  default: FriendMock,
}));
jest.unstable_mockModule("../../src/models/User.js", () => ({
  default: UserMock,
}));

const { acceptFriendRequest } = await import("../../src/controllers/friendController.js");
const { default: FriendRequest } = await import("../../src/models/FriendRequest.js");
const { default: Friend } = await import("../../src/models/Friend.js");
const { default: User } = await import("../../src/models/User.js");

const USER_ID = "222222222222222222222222";
const FROM_ID = "111111111111111111111111";
const REQUEST_ID = "req111111111111111111111";

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  req.user = { _id: USER_ID };
  next();
});
app.post("/friends/requests/:requestId/accept", acceptFriendRequest);

describe("acceptFriendRequest", () => {
  beforeEach(() => jest.clearAllMocks());

  test("404 - không tìm thấy lời mời", async () => {
    FriendRequest.findById.mockResolvedValue(null);

    const res = await request(app).post(`/friends/requests/${REQUEST_ID}/accept`);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Không tìm thấy lời mời kết bạn");
  });

  test("403 - không có quyền chấp nhận", async () => {
    FriendRequest.findById.mockResolvedValue({
      to: { toString: () => "999999999999999999999999" }, // khác USER_ID
      from: FROM_ID,
    });

    const res = await request(app).post(`/friends/requests/${REQUEST_ID}/accept`);

    expect(res.status).toBe(403);
    expect(res.body.message).toBe("Bạn không có quyền chấp nhận lời mời này");
  });

  test("200 - chấp nhận thành công", async () => {
    FriendRequest.findById.mockResolvedValue({
      to: { toString: () => USER_ID },
      from: FROM_ID,
      _id: REQUEST_ID,
    });
    Friend.create.mockResolvedValue({});
    FriendRequest.findByIdAndDelete.mockResolvedValue({});
    User.findById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: FROM_ID,
          displayName: "User A",
          avatarUrl: "http://avatar.com/a.jpg",
        }),
      }),
    });

    const res = await request(app).post(`/friends/requests/${REQUEST_ID}/accept`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Chấp nhận lời mời kết bạn thành công");
    expect(res.body.newFriend).toHaveProperty("displayName", "User A");
  });

  test("500 - lỗi hệ thống", async () => {
    FriendRequest.findById.mockRejectedValue(new Error("DB error"));

    const res = await request(app).post(`/friends/requests/${REQUEST_ID}/accept`);

    expect(res.status).toBe(500);
  });
});