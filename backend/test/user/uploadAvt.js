import { jest } from "@jest/globals";

const mockUploadImageFromBuffer = jest.fn();
const mockFindByIdAndUpdate = jest.fn();

jest.unstable_mockModule("../../src/middlewares/uploadMiddleware.js", () => ({
    uploadImageFromBuffer: mockUploadImageFromBuffer
}));

jest.unstable_mockModule("../../src/models/User.js", () => ({
    default: {
        findByIdAndUpdate: mockFindByIdAndUpdate
    }
}));

const { uploadAvatar } = await import(
    "../../src/controllers/userController.js"
);

describe("User Controller - uploadAvatar()", () => {

    let req;
    let res;

    beforeEach(() => {

        jest.clearAllMocks();
        jest.spyOn(console, "error").mockImplementation(() => {});

        req = {
            file: {
                buffer: Buffer.from("fake image")
            },
            user: {
                _id: "123"
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

    test("Should return 400 when no file uploaded", async () => {

        req.file = null;

        await uploadAvatar(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            message: "No file uploaded"
        });

    });

    test("Should upload avatar successfully", async () => {

        mockUploadImageFromBuffer.mockResolvedValue({
            secure_url: "avatar.jpg",
            public_id: "avatar123"
        });

        mockFindByIdAndUpdate.mockReturnValue({
            select: jest.fn().mockResolvedValue({
                avatarUrl: "avatar.jpg"
            })
        });

        await uploadAvatar(req, res);

        expect(mockUploadImageFromBuffer).toHaveBeenCalledWith(
            req.file.buffer
        );

        expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
            "123",
            {
                avatarUrl: "avatar.jpg",
                avatarId: "avatar123"
            },
            {
                new: true
            }
        );

        expect(res.status).toHaveBeenCalledWith(200);

        expect(res.json).toHaveBeenCalledWith({
            avatarUrl: "avatar.jpg"
        });

    });

    test("Should return 400 when avatarUrl is null", async () => {

        mockUploadImageFromBuffer.mockResolvedValue({
            secure_url: "avatar.jpg",
            public_id: "avatar123"
        });

        mockFindByIdAndUpdate.mockReturnValue({
            select: jest.fn().mockResolvedValue({
                avatarUrl: null
            })
        });

        await uploadAvatar(req, res);

        expect(res.status).toHaveBeenCalledWith(400);

        expect(res.json).toHaveBeenCalledWith({
            message: "Avatar trả về null"
        });

    });

    test("Should return 500 when Cloudinary throws", async () => {

        mockUploadImageFromBuffer.mockRejectedValue(
            new Error("Cloudinary Error")
        );

        await uploadAvatar(req, res);

        expect(res.status).toHaveBeenCalledWith(500);

        expect(res.json).toHaveBeenCalledWith({
            message: "Upload failed"
        });

    });

    test("Should return 500 when Mongo throws", async () => {

        mockUploadImageFromBuffer.mockResolvedValue({
            secure_url: "avatar.jpg",
            public_id: "avatar123"
        });

        mockFindByIdAndUpdate.mockReturnValue({
            select: jest.fn().mockRejectedValue(
                new Error("Mongo Error")
            )
        });

        await uploadAvatar(req, res);

        expect(res.status).toHaveBeenCalledWith(500);

        expect(res.json).toHaveBeenCalledWith({
            message: "Upload failed"
        });

    });

});