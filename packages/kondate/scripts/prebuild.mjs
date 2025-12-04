import fsPromises from 'node:fs/promises';
import path from 'node:path';

await Promise.all([
  import('../package.json', { with: { type: 'json' } }).then(
    ({ default: pkg }) =>
      fsPromises.writeFile(
        path.join('src', 'consts', 'package.ts'),
        `export const version = ${JSON.stringify(pkg.version)};
export const homepage = ${JSON.stringify(pkg.homepage)}`,
      ),
  ),
  // Copy vendored context files. Symlinks won't work because Jest doesn't support `preserveSymlinks`.
  // https://github.com/jestjs/jest/issues/5356
  ...[
    path.join(
      '..',
      '..',
      'vendored',
      'activitystreams',
      'ns',
      'activitystreams.jsonld',
    ),
    path.join(
      '..',
      '..',
      'vendored',
      'security-vocab',
      'contexts',
      'security-v1.jsonld',
    ),
    path.join('..', '..', 'vendored', 'miscellany', 'miscellany.jsonld'),
    path.join(
      '..',
      '..',
      'vendored',
      'schemaorg',
      'data',
      'releases',
      '29.4',
      'schemaorgcontext.jsonld',
    ),
    path.join(
      '..',
      '..',
      'vendored',
      'web-payments.org',
      'contexts',
      'identity-v1.jsonld',
    ),
  ].map(async (src) => {
    const dstName = /** @type {string} */ path
      .basename(src)
      .replace(/\.jsonld$/, '.json');
    await fsPromises.copyFile(
      src,
      path.join('src', 'resolvers', 'generic', 'json-ld', 'contexts', dstName),
      fsPromises.constants.COPYFILE_FICLONE,
    );
  }),
]);
