/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.js'],
  clearMocks: true,
  restoreMocks: true,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  collectCoverageFrom: [
    'src/utils/httpResponse.js',
    'src/utils/authHttpResponse.js',
    'src/services/auth-public.service.js',
    'src/services/catalog/catalog.service.js',
  ],
};
