import { jest } from "@jest/globals";

const { updateConversationAfterCreateMessage, emitNewMessage } = await import("../../src/utils/messageHelper.js");

describe("messageHelper", () => {
  describe("updateConversationAfterCreateMessage", () => {
    it("Nên cập nhật lastMessage và unreadCounts đúng cách", () => {
      const mockUnreadCounts = new Map([
        ["user_1", 2],
        ["user_2", 0]
      ]);
      const conversation = {
        set: jest.fn(),
        participants: [
          { userId: "user_1" },
          { userId: "user_2" }
        ],
        unreadCounts: mockUnreadCounts
      };

      const message = {
        _id: "msg_123",
        content: "hello",
        createdAt: new Date("2023-01-01")
      };

      updateConversationAfterCreateMessage(conversation, message, "user_1");

      // Verify conversation.set
      expect(conversation.set).toHaveBeenCalledWith({
        seenBy: [],
        lastMessageAt: message.createdAt,
        lastMessage: {
          _id: "msg_123",
          content: "hello",
          senderId: "user_1",
          createdAt: message.createdAt
        }
      });

      // Verify unread counts
      // user_1 is sender, count -> 0
      // user_2 is not sender, count -> prev(0) + 1 = 1
      expect(mockUnreadCounts.get("user_1")).toBe(0);
      expect(mockUnreadCounts.get("user_2")).toBe(1);
    });
  });

  describe("emitNewMessage", () => {
    it("Nên emit sự kiện new-message tới phòng chat (conversationId)", () => {
      const mockIoEmit = jest.fn();
      const mockIoTo = jest.fn().mockReturnValue({ emit: mockIoEmit });
      const io = { to: mockIoTo };

      const conversation = {
        _id: "conv_123",
        lastMessage: "fake_last_msg",
        lastMessageAt: new Date(),
        unreadCounts: new Map()
      };
      const message = { content: "test" };

      emitNewMessage(io, conversation, message);

      expect(mockIoTo).toHaveBeenCalledWith("conv_123");
      expect(mockIoEmit).toHaveBeenCalledWith("new-message", {
        message,
        conversation: {
          _id: "conv_123",
          lastMessage: "fake_last_msg",
          lastMessageAt: conversation.lastMessageAt
        },
        unreadCounts: conversation.unreadCounts
      });
    });
  });
});
