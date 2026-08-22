import { jest } from "@jest/globals";

const mockFriendFindOne = jest.fn();
jest.unstable_mockModule("../../src/models/Friend.js", () => ({
  default: {
    findOne: mockFriendFindOne,
  },
}));

const mockConvFindById = jest.fn();
jest.unstable_mockModule("../../src/models/Conversation.js", () => ({
  default: {
    findById: mockConvFindById,
  },
}));

const { checkFriendship, checkGroupMembership } = await import("../../src/middlewares/friendMiddleware.js");

describe("friendMiddleware - checkFriendship", () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { user: { _id: "me_123" }, body: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
  });

  it("Nên trả về 400 nếu thiếu recipientId và memberIds", async () => {
    await checkFriendship(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Cần cung cấp recipientId hoặc memberIds" });
  });

  it("Nên trả về 403 nếu recipientId không phải là bạn bè", async () => {
    req.body = { recipientId: "not_friend" };
    mockFriendFindOne.mockResolvedValue(null);

    await checkFriendship(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Bạn chưa kết bạn với người này" });
  });

  it("Nên gọi next nếu recipientId là bạn bè", async () => {
    req.body = { recipientId: "friend_1" };
    mockFriendFindOne.mockResolvedValue({ _id: "friendship_1" });

    await checkFriendship(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("Nên trả về 403 nếu có thành viên trong memberIds không phải là bạn bè", async () => {
    req.body = { memberIds: ["friend_1", "not_friend"] };
    // friend_1 => found, not_friend => null
    mockFriendFindOne
      .mockResolvedValueOnce({ _id: "f_1" })
      .mockResolvedValueOnce(null);

    await checkFriendship(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: "Bạn chỉ có thể thêm bạn bè vào nhóm.",
      notFriends: ["not_friend"],
    });
  });

  it("Nên gọi next nếu tất cả memberIds đều là bạn bè", async () => {
    req.body = { memberIds: ["friend_1", "friend_2"] };
    mockFriendFindOne.mockResolvedValue({ _id: "some_id" });

    await checkFriendship(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});

describe("friendMiddleware - checkGroupMembership", () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { user: { _id: "me_123" }, body: { conversationId: "conv_1" } };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
  });

  it("Nên trả về 404 nếu không tìm thấy conversation", async () => {
    mockConvFindById.mockResolvedValue(null);
    await checkGroupMembership(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Không tìm thấy cuộc trò chuyện" });
  });

  it("Nên trả về 403 nếu user không ở trong group", async () => {
    mockConvFindById.mockResolvedValue({
      participants: [{ userId: "other_user" }]
    });
    
    await checkGroupMembership(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Bạn không ở trong group này." });
  });

  it("Nên gán req.conversation và gọi next nếu user ở trong group", async () => {
    const fakeConv = { participants: [{ userId: "me_123" }] };
    mockConvFindById.mockResolvedValue(fakeConv);

    await checkGroupMembership(req, res, next);

    expect(req.conversation).toEqual(fakeConv);
    expect(next).toHaveBeenCalled();
  });

  it("Nên trả về 500 nếu có lỗi DB", async () => {
    mockConvFindById.mockRejectedValue(new Error("DB error"));
    await checkGroupMembership(req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Lỗi hệ thống" });
  });
});
