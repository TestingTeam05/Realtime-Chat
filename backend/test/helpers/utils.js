import { jest } from "@jest/globals";
import User from "../../src/models/User.js";
import Session from "../../src/models/Session.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// Mock environment variable
process.env.ACCESS_TOKEN_SECRET = "test-secret-key-for-unit-tests";

/**
 * Tạo user test trong DB
 * @param {Object} overrides - Ghi đè các field mặc định
 * @returns {Promise<Document>} User document
 */
export const createTestUser = async (overrides = {}) => {
    const password = overrides.password || "Test@123";
    const hashedPassword = await bcrypt.hash(password, 10);

    return User.create({
        username: overrides.username || `user_${Date.now()}`,
        hashedPassword,
        email: overrides.email || `${Date.now()}@test.com`,
        displayName: overrides.displayName || "Test User",
        ...overrides,
        hashedPassword, // luôn dùng hash, không cho ghi đè
    });
};

/**
 * Tạo access token cho user
 * @param {string} userId
 * @returns {string} JWT access token
 */
export const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "30m",
    });
};

/**
 * Tạo session với refresh token cho user
 * @param {string} userId
 * @returns {Promise<{session: Document, refreshToken: string}>}
 */
export const createTestSession = async (userId) => {
    const refreshToken = `test-refresh-token-${Date.now()}`;
    const session = await Session.create({
        userId,
        refreshToken,
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    });
    return { session, refreshToken };
};

/**
 * Factory cho mock req object
 */
export const mockReq = (overrides = {}) => ({
    body: {},
    params: {},
    query: {},
    cookies: {},
    headers: {},
    user: null,
    ...overrides,
});

/**
 * Factory cho mock res object
 */
export const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.sendStatus = jest.fn().mockReturnValue(res);
    res.cookie = jest.fn().mockReturnValue(res);
    res.clearCookie = jest.fn().mockReturnValue(res);
    return res;
};
