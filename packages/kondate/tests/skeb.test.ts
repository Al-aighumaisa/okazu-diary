import { resolvers } from '../src';
import * as common from './common';

const fetchSpy = common.mockFetch('skeb');

afterEach(() => {
  fetchSpy.mockClear();
});

describe(resolvers.skeb.resolve, () => {
  test.each([
    {
      title: 'illust',
      path: '/@Kasushibori/works/210',
      api: '/api/users/Kasushibori/works/210',
    },
    {
      title: 'comic',
      path: '/@osasimilli/works/29',
      api: '/api/users/osasimilli/works/29',
    },
    { title: 'legacy-url', path: '/works/3', api: '/api/works/3' },
  ])('snapshot $title ($path)', async ({ path, api }) => {
    await expect(
      resolvers.skeb
        .resolve(`https://skeb.jp${path}`)
        .then(({ value }) => value),
    ).resolves.toMatchSnapshot();

    expect(fetchSpy.mock.calls).toStrictEqual([
      [`https://skeb.jp${api}`, expect.anything()],
    ]);
  });
});
