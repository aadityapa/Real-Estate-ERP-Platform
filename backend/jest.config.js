/** Jest configuration for the PropOS backend (ts-jest). */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src", "<rootDir>/test"],
  testRegex: ".*\\.(spec|e2e-spec)\\.ts$",
  moduleNameMapper: {
    "^@propos/shared-types$": "<rootDir>/../packages/shared-types/src",
    "^@propos/shared-utils$": "<rootDir>/../packages/shared-utils/src",
  },
  // Fix paths relative to repo backend package root
  rootDir: ".",
  modulePaths: ["<rootDir>"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: {
          module: "commonjs",
          esModuleInterop: true,
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
          strict: true,
          skipLibCheck: true,
        },
      },
    ],
  },
  collectCoverageFrom: [
    "src/modules/auth/auth.service.ts",
    "src/modules/crm/leads/leads.service.ts",
    "src/common/utils/crypto.ts",
    "src/common/interceptors/transform.interceptor.ts",
    "!**/*.spec.ts",
    "!**/*.module.ts",
    "!**/dto/**",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "text-summary"],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 55,
      lines: 70,
      statements: 70,
    },
  },
};
