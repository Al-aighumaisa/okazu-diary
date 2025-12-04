import { resolvers } from '../src';
import * as common from './common';

const fetchSpy = common.mockFetch('melonbooks');

afterEach(() => {
  fetchSpy.mockClear();
});

describe(resolvers.melonbooks.resolve, () => {
  test.each([
    {
      title: 'generic',
      url: 'https://www.melonbooks.co.jp/detail/detail.php?product_id=15780',
    },
    {
      title: 'r18',
      url: 'https://www.melonbooks.co.jp/detail/detail.php?product_id=15782',
    },
  ])('snapshot $title', async ({ url }) => {
    await expect(
      resolvers.melonbooks.resolve(url).then(({ value }) => value),
    ).resolves.toMatchSnapshot();
  });
});
