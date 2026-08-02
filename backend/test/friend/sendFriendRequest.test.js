import request from "supertest";
import express from "express";
import { jest } from "@jest/globals";

const FriendRequestMock = {
  findOne: jest.fn(),
  create: jest.fn(),
};

const FriendMock = {
  findOne: jest.fn(),
};

const UserMock = {
  exists: jest.fn(),
};

// Mock các model
jest.unstable_mockModule("../../src/models/User.js", () => ({
  default: UserMock,
}));
jest.unstable_mockModule("../../src/models/Friend.js", () => ({
  default: FriendMock,
}));
jest.unstable_mockModule("../../src/models/FriendRequest.js", () => ({
  default: FriendRequestMock,
}));    

const {sendFriendRequest} = await import("../../src/controllers/friendController.js");
const { default: User } = await import("../../src/models/User.js");
const { default: Friend } = await import("../../src/models/Friend.js");
const { default: FriendRequest } = await import("../../src/models/FriendRequest.js");



// Tạo app nhỏ để test, inject req.user giả
const app = express();
app.use(express.json());
app.use((req, res, next) => {
  req.user = { _id: "111111111111111111111111" }; // userFrom
  next();
});
app.post("/friends/requests", sendFriendRequest);

const TO_ID = "222222222222222222222222";

describe("sendFriendRequest", () => {
  beforeEach(() => jest.clearAllMocks());

  test("400 - gửi lời mời cho chính mình", async () => {
    const app2 = express();
    app2.use(express.json());
    app2.use((req, res, next) => {
      req.user = { _id: TO_ID };
      next();
    });
    app2.post("/friends/requests", sendFriendRequest);

    const res = await request(app2)
      .post("/friends/requests")
      .send({ to: TO_ID });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Không thể gửi lời mời kết bạn cho chính mình");
  });

  test("404 - người dùng không tồn tại", async () => {
    User.exists.mockResolvedValue(null);

    const res = await request(app)
      .post("/friends/requests")
      .send({ to: TO_ID });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Người dùng không tồn tại");
  });

  test("400 - hai người đã là bạn bè", async () => {
    User.exists.mockResolvedValue(true);
    Friend.findOne.mockResolvedValue({ userA: "111...", userB: TO_ID });
    FriendRequest.findOne.mockResolvedValue(null);

    const res = await request(app)
      .post("/friends/requests")
      .send({ to: TO_ID });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Hai người đã là bạn bè");
  });

  test("400 - đã có lời mời đang chờ", async () => {
    User.exists.mockResolvedValue(true);
    Friend.findOne.mockResolvedValue(null);
    FriendRequest.findOne.mockResolvedValue({ from: "111...", to: TO_ID });

    const res = await request(app)
      .post("/friends/requests")
      .send({ to: TO_ID });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Đã có lời mời kết bạn đang chờ");
  });

  test("201 - gửi lời mời thành công", async () => {
    User.exists.mockResolvedValue(true);
    Friend.findOne.mockResolvedValue(null);
    FriendRequest.findOne.mockResolvedValue(null);
    FriendRequest.create.mockResolvedValue({ _id: "req1", from: "111...", to: TO_ID });

    const res = await request(app)
      .post("/friends/requests")
      .send({ to: TO_ID, message: "Hello" });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Gửi lời mời kết bạn thành công");
    expect(res.body.request).toBeDefined();
  });

  test("500 - lỗi hệ thống", async () => {
    User.exists.mockRejectedValue(new Error("DB error"));

    const res = await request(app)
      .post("/friends/requests")
      .send({ to: TO_ID });

    expect(res.status).toBe(500);
  });
});