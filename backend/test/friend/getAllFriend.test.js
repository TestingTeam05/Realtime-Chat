import request from "supertest";
import express from "express";
import { jest } from "@jest/globals";

const USER_ID = "111111111111111111111111";
const FriendMock = {
  find: jest.fn(),
};

jest.unstable_mockModule("../../src/models/Friend.js", () => ({
  default: FriendMock,
}));

const { getAllFriends } = await import("../../src/controllers/friendController.js");
const { default: Friend } = await import("../../src/models/Friend.js");


const app = express();
app.use(express.json());
app.use((req, res, next) => {
  req.user = { _id: USER_ID };
  next();
});
app.get("/friends", getAllFriends);

describe("getAllFriends", () => {
  beforeEach(() => jest.clearAllMocks());

  test("200 - không có bạn bè nào", async () => {
    Friend.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      }),
    });

    const res = await request(app).get("/friends");

    expect(res.status).toBe(200);
    expect(res.body.friends).toEqual([]);
  });

  test("200 - trả về danh sách bạn bè", async () => {
    const FRIEND_ID = "333333333333333333333333";
    Friend.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            {
              userA: { _id: USER_ID, displayName: "Me" },
              userB: { _id: FRIEND_ID, displayName: "Friend A" },
            },
          ]),
        }),
      }),
    });

    const res = await request(app).get("/friends");

    expect(res.status).toBe(200);
    expect(res.body.friends).toHaveLength(1);
    expect(res.body.friends[0].displayName).toBe("Friend A");
  });

  test("500 - lỗi hệ thống", async () => {
    Friend.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockRejectedValue(new Error("DB error")),
        }),
      }),
    });

    const res = await request(app).get("/friends");

    expect(res.status).toBe(500);
  });
});