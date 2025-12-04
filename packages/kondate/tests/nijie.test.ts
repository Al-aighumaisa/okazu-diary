import { resolvers } from '../src';
import * as common from './common';

const fetchSpy = common.mockFetch('nijie');

afterEach(() => {
  fetchSpy.mockClear();
});

describe(resolvers.nijie.resolve, () => {
  test.each([
    {
      title: 'single',
      url: 'https://nijie.info/view.php?id=208118',
      id: '208118',
    },
    {
      title: 'multiple',
      url: 'https://nijie.info/view.php?id=507755',
      id: '507755',
    },
    {
      title: 'animation',
      url: 'https://nijie.info/view.php?id=575706',
      id: '575706',
    },
    {
      title: 'page',
      url: 'https://nijie.info/view_popup.php?id=689855&#diff_17',
      id: '689855',
    },
  ])('snapshot $title', async ({ url, id }) => {
    await expect(
      resolvers.nijie.resolve(url).then(({ value }) => value),
    ).resolves.toMatchSnapshot();

    expect(fetchSpy.mock.calls).toStrictEqual([
      [
        `https://nijie.info/view.php?id=${id}`,
        expect.toBeOneOf([expect.any(Object), undefined]),
      ],
    ]);
  });
});
