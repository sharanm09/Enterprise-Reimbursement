module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/uploads/',
    '/scripts/',
    '/migrations/',
    '/__tests__/'
  ],
  collectCoverageFrom: [
    'routes/**/*.js',
    'utils/**/*.js',
    'config/**/*.js',
    'models/**/*.js',
    'middleware/**/*.js',
    'server.js',
    '!**/*.test.js',
    '!**/*.spec.js'
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  verbose: true
};

