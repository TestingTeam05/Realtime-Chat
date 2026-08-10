/** @type {import('jest').Config} */
export default {
  testEnvironment: "node",
  testMatch: ["<rootDir>/test/**/*.test.js"],
  testTimeout: 10000,
  verbose: true,
  transform: {},

  // Cấu hình Code Coverage cho SonarQube
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/server.js",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["lcov", "text"],
};
