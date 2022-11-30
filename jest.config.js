const SECONDS = 1000;

module.exports = {
    testEnvironment: "node",
    roots: ["<rootDir>/test"],
    testMatch: ["**/*.test.ts"],
    transform: {
        "^.+\\.tsx?$": "ts-jest",
    },
    testTimeout: 15 * SECONDS,
};
