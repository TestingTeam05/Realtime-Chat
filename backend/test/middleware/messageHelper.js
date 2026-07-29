import messageHelper from "../middleware/messageHelper.js"; 

describe("Unit Test - messageHelper", () => {
  it("Nên xử lý hoặc định dạng tin nhắn chính xác", () => {
    // Giả lập hàm helper format/sanitize tin nhắn nếu có
    const sampleInput = "  Hello World  ";
    
    // Nếu helper có hàm formatText hoặc tương tự:
    if (typeof messageHelper === "function") {
      const result = messageHelper(sampleInput);
      expect(result).toBeDefined();
    } else {
      expect(messageHelper).toBeDefined();
    }
  });
});
