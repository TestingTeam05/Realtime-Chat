import { jest } from "@jest/globals";

const mockQuery = {
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
};
mockQuery.then = function (resolve) {
  resolve(this.mockResult || []);
};

const mockFind = jest.fn().mockReturnValue(mockQuery);

jest.unstable_mockModule("../../src/models/Message.js", () => ({
  default: {
    find: mockFind,
  },
}));

const { getMessages } = await import(
  "../../src/controllers/conversationController.js"
);

describe("getMessages", () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      params: { conversationId: "conv_123" },
      query: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockQuery.mockResult = [];
  });

  it("Nên trả về messages mà không có nextCursor nếu số lượng <= limit", async () => {
    const fakeMessages = [
      { _id: "msg2", createdAt: new Date("2023-01-02") },
      { _id: "msg1", createdAt: new Date("2023-01-01") },
    ];
    mockQuery.mockResult = [...fakeMessages];
    req.query = { limit: "50" };

    await getMessages(req, res);

    expect(mockFind).toHaveBeenCalledWith({ conversationId: "conv_123" });
    expect(res.status).toHaveBeenCalledWith(200);
    // getMessages reverses the result before returning
    expect(res.json).toHaveBeenCalledWith({
      messages: [fakeMessages[1], fakeMessages[0]],
      nextCursor: null,
    });
  });

  it("Nên trả về nextCursor nếu số lượng messages > limit", async () => {
    const fakeMessages = [
      { _id: "msg3", createdAt: new Date("2023-01-03T00:00:00.000Z") },
      { _id: "msg2", createdAt: new Date("2023-01-02T00:00:00.000Z") },
      { _id: "msg1", createdAt: new Date("2023-01-01T00:00:00.000Z") }, // This is the (limit+1)th item
    ];
    mockQuery.mockResult = [...fakeMessages];
    req.query = { limit: "2" };

    await getMessages(req, res);

    expect(mockQuery.limit).toHaveBeenCalledWith(3); // limit + 1
    expect(res.status).toHaveBeenCalledWith(200);
    // It pops the last one to get nextCursor, so msg1 is removed and used for nextCursor
    // Then reverses remaining: [msg2, msg3]
    expect(res.json).toHaveBeenCalledWith({
      messages: [fakeMessages[1], fakeMessages[0]],
      nextCursor: "2023-01-01T00:00:00.000Z",
    });
  });

  it("Nên query với cursor nếu được cung cấp", async () => {
    req.query = { cursor: "2023-01-02T00:00:00.000Z" };
    mockQuery.mockResult = [];

    await getMessages(req, res);

    expect(mockFind).toHaveBeenCalledWith({
      conversationId: "conv_123",
      createdAt: { $lt: new Date("2023-01-02T00:00:00.000Z") },
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("Nên trả về 500 nếu DB lỗi", async () => {
    mockFind.mockImplementationOnce(() => {
      throw new Error("DB Error");
    });

    await getMessages(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Lỗi hệ thống" });
  });
});