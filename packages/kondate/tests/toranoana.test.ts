import { resolvers } from '../src';
import * as common from './common';

const fetchSpy = common.mockFetch('toranoana');

afterEach(() => {
  fetchSpy.mockClear();
});

describe(resolvers.toranoana.resolve, () => {
  test.each([
    {
      title: 'generic',
      url: 'https://ecs.toranoana.jp/tora/ec/item/200012706343/',
    },
    {
      title: 'r18',
      url: 'https://ec.toranoana.jp/tora_r/ec/item/040030634030/',
    },
    {
      title: 'generic-on-r18-floor',
      url: 'https://ec.toranoana.jp/tora_r/ec/item/200011723832/',
    },
  ])('snapshot $title', async ({ url }) => {
    await expect(
      resolvers.toranoana.resolve(url).then(({ value }) => value),
    ).resolves.toMatchSnapshot();
  });
});
