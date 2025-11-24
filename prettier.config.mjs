import prettierConfigStandard from 'prettier-config-standard' with { type: 'json' };

/** @typedef {import('prettier').Config} Config */

/** @type {Config} */
export default {
  .../** @type {Config} */ (prettierConfigStandard),
  trailingComma: 'all',
  semi: true,
};
