import { jest } from "@jest/globals";

const mockQuery = {
  lean: jest.fn().mockReturnThis(),
};
mockQuery.then = function (resolve) {
  resolve(this.mockResult);
};

const mockFindById = jest.fn().mockReturnValue(mockQuery);
const mockFindByIdAndUpdate = jest.fn();

jest.unstable_mockModule("../../src/models/Conversation.js", () => ({
  default: {
    findById: mockFindById,
    findByIdAndUpdate: mockFindByIdAndUpdate,
  },
}));

const mockIoTo = jest.fn();
const mockIoEmit = jest.fn();
mockIoTo.mockReturnValue({ emit: mockIoEmit });

jest.unstable_mockModule("../../src/socket/index.js", () => ({
  io: {
    to: mockIoTo,
  },
}));

const { markAsSeen } = await import("../../src/controllers/conversationController.js");

describe("markAsSeen", () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      params: { conversationId: "conv_123" },
      user: { _id: "user_me" },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockQuery.mockResult = null;
  });

  it("Nên trả về 404 nếu conversation không tồn tại", async () => {
    mockQuery.mockResult = null;

    await markAsSeen(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Conversation không tồn tại" });
  });

  it("Nên trả về 200 nếu không có lastMessage", async () => {
    mockQuery.mockResult = { _id: "conv_123", lastMessage: null };

    await markAsSeen(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: "Không có tin nhắn để mark as seen" });
  });

  it("Nên trả về 200 nếu user là người gửi lastMessage", async () => {
    mockQuery.mockResult = { 
      _id: "conv_123", 
      lastMessage: { senderId: "user_me" } 
    };

    await markAsSeen(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: "Sender không cần mark as seen" });
  });

  it("Nên cập nhật seenBy và trả về 200 thành công", async () => {
    mockQuery.mockResult = { 
      _id: "conv_123", 
      lastMessage: { senderId: "user_other", content: "hello" } 
    };

    const updatedConv = {
      _id: "conv_123",
      lastMessage: { _id: "msg1", senderId: "user_other", content: "hello", createdAt: new Date() },
      seenBy: ["user_me"],
      unreadCounts: { user_me: 0 }
    };

    mockFindByIdAndUpdate.mockResolvedValue(updatedConv);

    await markAsSeen(req, res);

    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
      "conv_123",
      {
        $addToSet: { seenBy: "user_me" },
        $set: { "unreadCounts.user_me": 0 },
      },
      { new: true }
    );
    expect(mockIoTo).toHaveBeenCalledWith("conv_123");
    expect(mockIoEmit).toHaveBeenCalledWith("read-message", expect.any(Object));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Marked as seen" }));
  });

  it("Nên trả về 500 nếu DB lỗi", async () => {
    mockFindById.mockImplementationOnce(() => {
      throw new Error("DB error");
    });

    await markAsSeen(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Lỗi hệ thống" });
  });
});