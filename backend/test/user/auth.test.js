import { jest } from "@jest/globals";
import { authMe } from "../../src/controllers/userController.js";

describe("User Controller - authMe()", () => {
    let req;
    let res;

    beforeEach(() => {
        jest.spyOn(console, "error").mockImplementation(() => {});

        req = {
            user: {
                _id: "123",
                username: "nam",
                displayName: "Nguyễn Hoài Nam",
                avatarUrl: "avatar.jpg"
            }
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test("Should return authenticated user", async () => {
        await authMe(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            user: req.user
        });
    });

    test("Should return empty object", async () => {
        req.user = {};

        await authMe(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            user: {}
        });
    });

    test("Should return undefined user", async () => {
        req.user = undefined;

        await authMe(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            user: undefined
        });
    });

    test("Should return null user", async () => {
        req.user = null;

        await authMe(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            user: null
        });
    });

    test("Should return 500 when exception occurs", async () => {

        const badReq = {};

        Object.defineProperty(badReq, "user", {
            get() {
                throw new Error("Unexpected");
            }
        });

        await authMe(badReq, res);

        expect(res.status).toHaveBeenCalledWith(500);

        expect(res.json).toHaveBeenCalledWith({
            message: "Lỗi hệ thống"
        });
    });
});