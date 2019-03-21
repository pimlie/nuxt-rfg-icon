module.exports = {
  testEnvironment: 'node',

  expand: true,

  setupFilesAfterEnv: ['./test/utils/setup'],

  testPathIgnorePatterns: [
    'node_modules'
  ],

  transformIgnorePatterns: [
    'node_modules'
  ],

  transform: {
    '^.+\\.js$': 'babel-jest'
  },

  moduleFileExtensions: [
    'ts',
    'js',
    'json'
  ]
}
