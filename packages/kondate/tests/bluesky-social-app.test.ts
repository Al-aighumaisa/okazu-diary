import { type ResolveResult, resolvers } from '../src';
import * as common from './common';

jest.mock(
  '../src/resolvers/generic/http',
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  () => ({
    _esModule: true,
    ...jest.requireActual('../src/resolvers/generic/http'),
  }),
);

const fetchSpy = common.mockFetch('bluesky-social-app');

afterEach(() => {
  fetchSpy.mockClear();
});

describe(resolvers.blueskySocialApp.resolve, () => {
  test('snapshot for posterity', async () => {
    const url = 'https://bsky.app/profile/jay.bsky.team/post/3m25esnq4t22y';

    await expect(
      resolvers.blueskySocialApp.resolve(url).then(({ value }) => value),
    ).resolves.toMatchSnapshot();
  });

  describe('options.preferDiscovered: ["at-uri"]', () => {
    it('should resolve only AT URI when the option is set', async () => {
      const url = 'https://bsky.app/profile/bsky.app/post/3l6oveex3ii2l';
      const uri = 'at://bsky.app/app.bsky.feed.post/3l6oveex3ii2l';

      await expect(
        resolvers.blueskySocialApp.resolve(url, {
          preferDiscovered: ['at-uri'],
        }),
      ).resolves.toStrictEqual<ResolveResult>({
        value: { url: uri, resolver: { at: { uri } } },
        response: undefined,
      });

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should resolve the page for unkown route', async () => {
      const url = 'https://bsky.app/';

      const result = {
        value: { description: 'Test metadata' },
      } satisfies ResolveResult;
      const httpSpy = jest
        .spyOn(resolvers.genericHttp, 'resolve')
        .mockReturnValueOnce(Promise.resolve(result));

      try {
        await expect(
          resolvers.blueskySocialApp.resolve(url, {
            preferDiscovered: ['at-uri'],
          }),
        ).resolves.toStrictEqual(result);

        expect(httpSpy.mock.calls).toStrictEqual([
          [new URL(url), expect.any(Object)],
        ]);
      } finally {
        httpSpy.mockRestore();
      }
    });
  });
});
