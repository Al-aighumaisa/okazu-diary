import { type ResolveResult, resolvers } from '../src';
import * as common from './common';

const fetchSpy = common.mockFetch('fanza-video');

afterEach(() => {
  fetchSpy.mockClear();
});

describe(resolvers.fanzaVideo.resolve, () => {
  test.each([
    { floor: 'anime', id: '72leha29001' },
    { floor: 'cinema', id: '306ac1003' },
    { floor: 'unknown', id: '72leha29001' },
  ])('snapshot $floor/$id', async ({ floor, id }) => {
    const url = `https://video.dmm.co.jp/${floor}/content/?id=${id}`;

    await expect(
      resolvers.fanzaVideo.resolve(url).then(({ value }) => value),
    ).resolves.toMatchSnapshot();

    if (['av', 'amateur', 'anime', 'cinema'].includes(floor)) {
      expect(fetchSpy.mock.calls).toStrictEqual([
        [
          'https://api.video.dmm.co.jp/graphql',
          expect.objectContaining<RequestInit>({
            headers: expect.toSatisfy(
              (headers: RequestInit['headers']) =>
                new Headers(headers).get('accept')?.includes('json') ?? false,
            ),
          }),
        ],
      ]);
    } else {
      expect(fetchSpy.mock.calls).toStrictEqual([
        [new URL(url), expect.any(Object)],
      ]);
    }
  });

  it('returns undefined in case of 404', async () => {
    await expect(
      resolvers.fanzaVideo.resolve(
        'https://video.dmm.co.jp/av/content/?id=nonexistent',
      ),
    ).resolves.toStrictEqual<ResolveResult>({
      value: undefined,
      response: { status: 200, headers: expect.any(Headers) },
    });
  });
});
