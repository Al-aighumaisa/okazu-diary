import type { ResolveResult } from '../src';
import { as2, mediaType } from '../src/resolvers/generic';
import * as common from './common';

const fetchSpy = common.mockFetch('activity-streams');

afterEach(() => {
  fetchSpy.mockClear();
});

describe(as2.resolve, () => {
  test.each([
    {
      title: 'mastodon-safe-medium',
      uri: 'https://mastodon.social/users/Gargron/statuses/114562471720867464',
      actor: 'https://mastodon.social/users/Gargron',
    },
    {
      title: 'mastodon-html-url',
      uri: 'https://mastodon.social/@Mastodon/5258563',
      actor: 'https://mastodon.social/users/Mastodon',
    },
    {
      title: 'misskey-safe-and-sensitive-media',
      uri: 'https://misskey.io/notes/9hr4uembuc',
      actor: 'https://misskey.io/users/9basm36lnq',
    },
  ])('snapshot $title', async ({ uri, actor }) => {
    await expect(
      as2.resolve(uri).then(({ value }) => value),
    ).resolves.toMatchSnapshot();

    const as2ReqInit = expect.objectContaining<RequestInit>({
      headers: expect.toSatisfy(
        (headers: RequestInit['headers']) =>
          new Headers(headers)
            .get('accept')
            ?.split(',')
            .some(
              (v) =>
                mediaType.classify(v) === mediaType.MediaType.ActivityStreams,
            ) ?? false,
      ),
    });
    expect(fetchSpy.mock.calls).toStrictEqual([
      [uri, as2ReqInit],
      [actor, as2ReqInit],
    ]);
  });

  it('returns undefined in case of 404', async () => {
    fetchSpy.mockReturnValueOnce(
      Promise.resolve(new Response(null, { status: 404 })),
    );

    await expect(
      as2.resolve('https://example.com/404'),
    ).resolves.toStrictEqual<ResolveResult>({
      value: undefined,
      response: expect.any(Object),
    });
  });
});
