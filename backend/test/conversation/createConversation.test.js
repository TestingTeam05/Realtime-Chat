import { jest } from "@jest/globals";

const mockSave = jest.fn();
const mockPopulate = jest.fn();
const mockToObject = jest.fn();

const MockConversation = jest.fn().mockImplementation(function (data) {
  Object.assign(this, data);
  this.save = mockSave;
  this.populate = mockPopulate;
  this.toObject = () => mockToObject(data);
});
MockConversation.findOne = jest.fn();

jest.unstable_mockModule("../../src/models/Conversation.js", () => ({
  default: MockConversation,
}));

const mockIoTo = jest.fn();
const mockIoEmit = jest.fn();
mockIoTo.mockReturnValue({ emit: mockIoEmit });

jest.unstable_mockModule("../../src/socket/index.js", () => ({
  io: {
    to: mockIoTo,
  },
}));

const { default: Conversation } = await import("../../src/models/Conversation.js");
const { io } = await import("../../src/socket/index.js");
const { createConversation } = await import("../../src/controllers/conversationController.js");

describe("createConversation", () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: { _id: "user_me" },
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  it("Nên trả về 400 nếu type không hợp lệ hoặc thiếu thông tin", async () => {
    req.body = {};
    await createConversation(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    
    req.body = { type: "group" };
    await createConversation(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    
    req.body = { type: "direct", memberIds: [] };
    await createConversation(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("Nên tạo direct conversation thành công", async () => {
    req.body = { type: "direct", memberIds: ["user_other"] };
    Conversation.findOne.mockResolvedValue(null);
    mockToObject.mockReturnValue({ _id: "conv_123" });

    await createConversation(req, res);

    expect(Conversation.findOne).toHaveBeenCalledWith({
      type: "direct",
      "participants.userId": { $all: ["user_me", "user_other"] },
    });
    expect(mockSave).toHaveBeenCalled();
    expect(mockPopulate).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(io.to).toHaveBeenCalledWith("user_me");
    expect(io.to).toHaveBeenCalledWith("user_other");
    expect(mockIoEmit).toHaveBeenCalledWith("new-group", expect.any(Object));
  });
  
  it("Nên trả về conversation cũ nếu direct conversation đã tồn tại", async () => {
    req.body = { type: "direct", memberIds: ["user_other"] };
    
    const existingConv = {
      _id: "conv_old",
      populate: mockPopulate,
      toObject: () => ({ _id: "conv_old" }),
      participants: [{ userId: { _id: "user_other", displayName: "Other" } }]
    };
    Conversation.findOne.mockResolvedValue(existingConv);

    await createConversation(req, res);

    expect(mockSave).not.toHaveBeenCalled();
    expect(mockPopulate).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("Nên tạo group conversation thành công", async () => {
    req.body = { type: "group", name: "My Group", memberIds: ["user_other"] };
    mockToObject.mockReturnValue({ _id: "conv_group" });

    await createConversation(req, res);

    expect(mockSave).toHaveBeenCalled();
    expect(mockPopulate).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(io.to).toHaveBeenCalledWith("user_other");
  });

  it("Nên trả về 500 nếu có lỗi DB", async () => {
    req.body = { type: "direct", memberIds: ["user_other"] };
    Conversation.findOne.mockRejectedValue(new Error("DB Error"));

    await createConversation(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Lỗi hệ thống" });
  });
});