/** Jest configuration for the PropOS backend (ts-jest). */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "src",
  testRegex: ".*\\.spec\\.ts$",
  moduleNameMapper: {
    "^@propos/shared-types$": "<rootDir>/../../packages/shared-types/src",
    "^@propos/shared-utils$": "<rootDir>/../../packages/shared-utils/src",
  },
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "<rootDir>/../tsconfig.json" }],
  },
  collectCoverageFrom: ["**/*.ts", "!**/*.spec.ts", "!**/node_modules/**"],
};
