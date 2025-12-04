/** @type {import('jest').Config} */
export default {
  displayName: 'Kondate',
  transform: { '^.+\\.ts$': '@swc/jest' },
  moduleNameMapper: { '^(\\.\\.?\\/.+)\\.js$': ['$1.ts', '$1.js'] },
  setupFilesAfterEnv: ['jest-extended/all'],
};
