import request from "supertest";
import express from "express";
import { jest } from "@jest/globals";

const FriendRequestMock = {
  findById: jest.fn(),
  findByIdAndDelete: jest.fn(),
};

jest.unstable_mockModule("../../src/models/FriendRequest.js", () => ({
  default: FriendRequestMock,
}));

const { declineFriendRequest } = await import("../../src/controllers/friendController.js");
const { default: FriendRequest } = await import("../../src/models/FriendRequest.js");

const USER_ID = "222222222222222222222222";
const REQUEST_ID = "req111111111111111111111";

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  req.user = { _id: USER_ID };
  next();
});
app.post("/friends/requests/:requestId/decline", declineFriendRequest);

describe("declineFriendRequest", () => {
  beforeEach(() => jest.clearAllMocks());

  test("404 - không tìm thấy lời mời", async () => {
    FriendRequest.findById.mockResolvedValue(null);

    const res = await request(app).post(`/friends/requests/${REQUEST_ID}/decline`);

    expect(res.status).toBe(404);
  });

  test("403 - không có quyền từ chối", async () => {
    FriendRequest.findById.mockResolvedValue({
      to: { toString: () => "999999999999999999999999" },
    });

    const res = await request(app).post(`/friends/requests/${REQUEST_ID}/decline`);

    expect(res.status).toBe(403);
    expect(res.body.message).toBe("Bạn không có quyền từ chối lời mời này");
  });

  test("204 - từ chối thành công", async () => {
    FriendRequest.findById.mockResolvedValue({
      to: { toString: () => USER_ID },
    });
    FriendRequest.findByIdAndDelete.mockResolvedValue({});

    const res = await request(app).post(`/friends/requests/${REQUEST_ID}/decline`);

    expect(res.status).toBe(204);
  });

  test("500 - lỗi hệ thống", async () => {
    FriendRequest.findById.mockRejectedValue(new Error("DB error"));

    const res = await request(app).post(`/friends/requests/${REQUEST_ID}/decline`);

    expect(res.status).toBe(500);
  });
});