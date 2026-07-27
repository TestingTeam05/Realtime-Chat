import request from "supertest";
import express from "express";
import { jest } from "@jest/globals";

const USER_ID = "111111111111111111111111";

const FriendRequestMock = {
  find: jest.fn(),
};

jest.unstable_mockModule("../../src/models/FriendRequest.js", () => ({
  default: FriendRequestMock,
}));

const { getFriendRequests } = await import("../../src/controllers/friendController.js");
const { default: FriendRequest } = await import("../../src/models/FriendRequest.js");

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  req.user = { _id: USER_ID };
  next();
});
app.get("/friends/requests", getFriendRequests);

describe("getFriendRequests", () => {
  beforeEach(() => jest.clearAllMocks());

  test("200 - trả về sent và received rỗng", async () => {
    FriendRequest.find.mockReturnValue({
      populate: jest.fn().mockResolvedValue([]),
    });

    const res = await request(app).get("/friends/requests");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("sent");
    expect(res.body).toHaveProperty("received");
  });

  test("200 - có lời mời đã gửi và nhận", async () => {
    FriendRequest.find
      .mockReturnValueOnce({
        populate: jest.fn().mockResolvedValue([{ _id: "req1", to: "userB" }]),
      })
      .mockReturnValueOnce({
        populate: jest.fn().mockResolvedValue([{ _id: "req2", from: "userC" }]),
      });

    const res = await request(app).get("/friends/requests");

    expect(res.status).toBe(200);
    expect(res.body.sent).toHaveLength(1);
    expect(res.body.received).toHaveLength(1);
  });

  test("500 - lỗi hệ thống", async () => {
    FriendRequest.find.mockReturnValue({
      populate: jest.fn().mockRejectedValue(new Error("DB error")),
    });

    const res = await request(app).get("/friends/requests");

    expect(res.status).toBe(500);
  });
});