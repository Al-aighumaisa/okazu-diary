import { type Metadata, type ResolveResult, resolvers } from '../src';
import * as common from './common';

const fetchSpy = common.mockFetch('pixiv');

afterEach(() => {
  fetchSpy.mockClear();
});

describe(resolvers.pixiv.resolve, () => {
  test.each([
    { title: 'illust-single-sfw', id: '1580459' },
    { title: 'illust-multi-sensitive', id: '66086550' },
    { title: 'illust-multi-r18', id: '73814313' },
    { title: 'illust-updated', id: '34231632' },
    { title: 'ugoira', id: '44298467' },
    { title: 'manga', id: '46267137' },
    { title: 'manga-book', id: '46271807' },
    { title: 'series', id: '60103962' },
    { title: 'image-response', id: '60114898' },
    { title: 'html-description', id: '5385135' },
    { title: 'illust-genai', id: '98686026' },
  ])('snapshot $title ($id)', async ({ id }) => {
    await expect(
      resolvers.pixiv
        .resolve(`https://www.pixiv.net/artworks/${id}`)
        .then(({ value }) => value),
    ).resolves.toMatchSnapshot();

    expect(fetchSpy.mock.calls).toStrictEqual([
      [`https://www.pixiv.net/ajax/illust/${id}`, expect.anything()],
    ]);
  });

  it('handles page number', async () => {
    await expect(
      resolvers.pixiv.resolve('https://www.pixiv.net/artworks/46267137#1'),
    ).resolves.toStrictEqual<ResolveResult>({
      value: expect.objectContaining<Partial<Metadata>>({
        url: 'https://www.pixiv.net/artworks/46267137#1',
        image: [
          {
            contentUrl:
              'https://i.pixiv.cat/img-master/img/2014/09/30/13/09/04/46267137_p0_master1200.jpg',
            encodingFormat: 'image/jpeg',
            ratio: {
              height: 600,
              width: 600,
            },
          },
        ],
        resolver: {
          pixivArtwork: expect.objectContaining<
            Partial<resolvers.pixiv.ArtworkMetadataExt>
          >({
            page: 0,
          }),
        },
      }),
      response: expect.not.objectContaining({ constructor: Response }),
    });

    await expect(
      resolvers.pixiv.resolve('https://www.pixiv.net/artworks/46267137#3'),
    ).resolves.toStrictEqual<ResolveResult>({
      value: expect.objectContaining<Partial<Metadata>>({
        url: 'https://www.pixiv.net/artworks/46267137#3',
        image: [
          {
            contentUrl:
              'https://i.pixiv.cat/img-master/img/2014/09/30/13/09/04/46267137_p2_master1200.jpg',
            encodingFormat: 'image/jpeg',
            // The AJAX response contains the ratio only for the first page, so the property should
            // be omitted for other pages.
            ratio: undefined,
          },
        ],
        resolver: {
          pixivArtwork: expect.objectContaining({
            page: 2,
          }),
        },
      }),
      response: expect.not.objectContaining({ constructor: Response }),
    });
  });

  it('handles old format URL', async () => {
    await expect(
      resolvers.pixiv.resolve(
        'http://www.pixiv.net/member_illust.php?mode=medium&illust_id=1580459',
      ),
    ).resolves.toStrictEqual<ResolveResult>({
      value: expect.objectContaining<Partial<Metadata>>({
        url: 'https://www.pixiv.net/artworks/1580459',
      }),
      response: expect.not.objectContaining({ constructor: Response }),
    });

    expect(fetchSpy.mock.calls).toStrictEqual([
      ['https://www.pixiv.net/ajax/illust/1580459', expect.anything()],
    ]);

    fetchSpy.mockClear();

    await expect(
      resolvers.pixiv.resolve(
        'http://www.pixiv.net/member_illust.php?mode=medium&illust_id=66086550&page=1',
      ),
    ).resolves.toStrictEqual<ResolveResult>({
      value: expect.objectContaining<Partial<Metadata>>({
        url: 'https://www.pixiv.net/artworks/66086550#2',
      }),
      response: expect.not.objectContaining({ constructor: Response }),
    });

    expect(fetchSpy.mock.calls).toStrictEqual([
      ['https://www.pixiv.net/ajax/illust/66086550', expect.anything()],
    ]);
  });

  it('returns undefined in case of 404', async () => {
    await expect(
      resolvers.pixiv.resolve('https://www.pixiv.net/artworks/404'),
    ).resolves.toStrictEqual<ResolveResult>({
      value: undefined,
      response: { status: 404, headers: expect.any(Headers) },
    });
  });
});
