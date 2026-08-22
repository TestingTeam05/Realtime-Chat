import { jest } from "@jest/globals";

const mockConversationFindById = jest.fn();
const mockConversationCreate = jest.fn();
const mockMessageCreate = jest.fn();
const mockSave = jest.fn();

jest.unstable_mockModule("../../src/models/Conversation.js", () => ({
  default: {
    findById: mockConversationFindById,
    create: mockConversationCreate,
  },
}));

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

const { sendDirectMessage } = await import("../../src/controllers/messageController.js");
const { default: Conversation } = await import("../../src/models/Conversation.js");
const { default: Message } = await import("../../src/models/Message.js");

describe("sendDirectMessage", () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: { _id: "sender_123" },
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  it("Nên trả về 400 nếu thiếu content", async () => {
    req.body = { recipientId: "rec_1" };
    await sendDirectMessage(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Thiếu nội dung" });
  });

  it("Nên sử dụng conversationId có sẵn và gửi tin nhắn thành công", async () => {
    req.body = { content: "hello", conversationId: "conv_1" };
    
    const mockConv = { _id: "conv_1", save: mockSave };
    Conversation.findById.mockResolvedValue(mockConv);
    Message.create.mockResolvedValue({ _id: "msg_1", content: "hello" });

    await sendDirectMessage(req, res);

    expect(Conversation.findById).toHaveBeenCalledWith("conv_1");
    expect(Message.create).toHaveBeenCalledWith({
      conversationId: "conv_1",
      senderId: "sender_123",
      content: "hello"
    });
    expect(mockUpdateConversation).toHaveBeenCalled();
    expect(mockSave).toHaveBeenCalled();
    expect(mockEmitNewMessage).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("Nên tạo conversation mới nếu không có conversationId", async () => {
    req.body = { content: "hello", recipientId: "rec_1" };
    
    const mockConv = { _id: "conv_new", save: mockSave };
    Conversation.create.mockResolvedValue(mockConv);
    Message.create.mockResolvedValue({ _id: "msg_1", content: "hello" });

    await sendDirectMessage(req, res);

    expect(Conversation.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("Nên trả về 500 nếu DB lỗi", async () => {
    req.body = { content: "hello", recipientId: "rec_1" };
    Conversation.create.mockRejectedValue(new Error("DB error"));

    await sendDirectMessage(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Lỗi hệ thống" });
  });
});
