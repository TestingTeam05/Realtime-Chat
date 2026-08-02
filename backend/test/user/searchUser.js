import { jest } from "@jest/globals";

const mockFindOne = jest.fn();

jest.unstable_mockModule("../../src/models/User.js", () => ({
    default: {
        findOne: mockFindOne
    }
}));

const { searchUserByUsername } = await import(
    "../../src/controllers/userController.js"
);

describe("User Controller - searchUserByUsername()", () => {

    let req;
    let res;

    beforeEach(() => {

        jest.clearAllMocks();
        jest.spyOn(console, "error").mockImplementation(() => {});

        req = {
            query: {}
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test("Should return 400 when username is missing", async () => {

        await searchUserByUsername(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            message: "Cần cung cấp username trong query."
        });

    });

    test("Should return 400 when username is empty", async () => {

        req.query.username = "";

        await searchUserByUsername(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            message: "Cần cung cấp username trong query."
        });

    });

    test("Should return user successfully", async () => {

        req.query.username = "nam";

        mockFindOne.mockReturnValue({
            select: jest.fn().mockResolvedValue({
                _id: "1",
                username: "nam",
                displayName: "Nam",
                avatarUrl: "avatar.jpg"
            })
        });

        await searchUserByUsername(req, res);

        expect(mockFindOne).toHaveBeenCalledWith({
            username: "nam"
        });

        expect(res.status).toHaveBeenCalledWith(200);

        expect(res.json).toHaveBeenCalledWith({
            user: {
                _id: "1",
                username: "nam",
                displayName: "Nam",
                avatarUrl: "avatar.jpg"
            }
        });

    });

    test("Should return null user", async () => {

        req.query.username = "abc";

        mockFindOne.mockReturnValue({
            select: jest.fn().mockResolvedValue(null)
        });

        await searchUserByUsername(req, res);

        expect(res.status).toHaveBeenCalledWith(200);

        expect(res.json).toHaveBeenCalledWith({
            user: null
        });

    });

    test("Should return 500 when database throws", async () => {

        req.query.username = "abc";

        mockFindOne.mockReturnValue({
            select: jest.fn().mockRejectedValue(new Error("Mongo Error"))
        });

        await searchUserByUsername(req, res);

        expect(res.status).toHaveBeenCalledWith(500);

        expect(res.json).toHaveBeenCalledWith({
            message: "Lỗi hệ thống"
        });

    });

});