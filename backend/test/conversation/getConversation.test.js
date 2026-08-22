import { jest } from "@jest/globals";

const mockQuery = {
  sort: jest.fn().mockReturnThis(),
  populate: jest.fn().mockReturnThis(),
};

mockQuery.then = function (resolve) {
  resolve(this.mockResult || []);
};

const mockFind = jest.fn().mockReturnValue(mockQuery);

jest.unstable_mockModule("../../src/models/Conversation.js", () => ({
  default: {
    find: mockFind,
  },
}));

const { getConversations } = await import(
  "../../src/controllers/conversationController.js"
);

describe("getConversations", () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { user: { _id: "user_me" } };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockQuery.mockResult = [];
  });

  it("Nên trả về danh sách conversations thành công", async () => {
    const fakeConv = {
      toObject: () => ({ _id: "conv_1" }),
      participants: [
        {
          userId: { _id: "user_other", displayName: "Other User" },
          joinedAt: new Date(),
        },
      ],
      unreadCounts: { user_me: 2 },
    };

    mockQuery.mockResult = [fakeConv];

    await getConversations(req, res);

    expect(mockFind).toHaveBeenCalledWith({
      "participants.userId": "user_me",
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        conversations: expect.arrayContaining([
          expect.objectContaining({
            _id: "conv_1",
            unreadCounts: { user_me: 2 },
            participants: expect.arrayContaining([
              expect.objectContaining({
                _id: "user_other",
                displayName: "Other User",
              }),
            ]),
          }),
        ]),
      })
    );
  });

  it("Nên trả về danh sách rỗng nếu không có conversation", async () => {
    mockQuery.mockResult = [];

    await getConversations(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ conversations: [] });
  });

  it("Nên trả về 500 nếu DB lỗi", async () => {
    mockFind.mockImplementationOnce(() => {
      throw new Error("DB Error");
    });

    await getConversations(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Lỗi hệ thống" });
  });
});