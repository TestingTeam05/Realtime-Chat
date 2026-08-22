import { jest } from "@jest/globals";

const mockMessageCreate = jest.fn();
const mockSave = jest.fn();

jest.unstable_mockModule("../../src/models/Message.js", () => ({
  default: {
    create: mockMessageCreate,
  },
}));

const mockUpdateConversation = jest.fn();
const mockEmitNewMessage = jest.fn();

jest.unstable_mockModule("../../src/utils/messageHelper.js", () => ({
  updateConversationAfterCreateMessage: mockUpdateConversation,
  emitNewMessage: mockEmitNewMessage,
}));

jest.unstable_mockModule("../../src/socket/index.js", () => ({
  io: {},
}));

const { sendGroupMessage } = await import("../../src/controllers/messageController.js");
const { default: Message } = await import("../../src/models/Message.js");

describe("sendGroupMessage", () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: { _id: "sender_123" },
      body: {},
      conversation: { _id: "conv_group", save: mockSave }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  it("Nên trả về 400 nếu thiếu content", async () => {
    req.body = { conversationId: "conv_group" };
    await sendGroupMessage(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith("Thiếu nội dung");
  });

  it("Nên tạo message và gửi thành công", async () => {
    req.body = { conversationId: "conv_group", content: "hello team" };
    Message.create.mockResolvedValue({ _id: "msg_1", content: "hello team" });

    await sendGroupMessage(req, res);

    expect(Message.create).toHaveBeenCalledWith({
      conversationId: "conv_group",
      senderId: "sender_123",
      content: "hello team"
    });
    expect(mockUpdateConversation).toHaveBeenCalled();
    expect(mockSave).toHaveBeenCalled();
    expect(mockEmitNewMessage).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("Nên trả về 500 nếu có lỗi", async () => {
    req.body = { conversationId: "conv_group", content: "hello team" };
    Message.create.mockRejectedValue(new Error("DB error"));

    await sendGroupMessage(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Lỗi hệ thống" });
  });
});
