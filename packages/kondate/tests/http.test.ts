import { JSDOM } from 'jsdom';

import type { Metadata, ResolveResult } from '../src';
import { as2, html, http } from '../src/resolvers/generic';

jest.mock(
  '../src/resolvers/generic/activity-streams',
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  () => ({
    _esModule: true,
    ...jest.requireActual('../src/resolvers/generic/activity-streams'),
  }),
);

jest.mock(
  '../src/resolvers/generic/html',
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  () => ({
    _esModule: true,
    ...jest.requireActual('../src/resolvers/generic/html'),
  }),
);

describe(http.resolve, () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test.each([
    { contentType: 'text/html' },
    { contentType: 'text/html; charset=utf-8' },
    { contentType: 'text/html;charset=utf-8' },
    { contentType: 'text/html; charset=UTF-8' },
    { contentType: 'application/xhtml+xml' },
    { contentType: 'application/xml' },
    { contentType: 'text/xml' },
  ])(
    'delegates HTML responses to `html` extractor, Content-Type: $contentType',
    async ({ contentType }) => {
      const res = new Response(
        '<html><meta><title>Test</title></meta></html>',
        {
          headers: {
            'content-type': contentType,
          },
        },
      );
      jest.spyOn(res, 'url', 'get').mockReturnValue('https://example.com/');
      jest.spyOn(global, 'fetch').mockReturnValueOnce(Promise.resolve(res));

      const value = { description: 'Test metadata' } satisfies Metadata;
      const extractSpy = jest
        .spyOn(html, 'extract')
        .mockReturnValueOnce(
          Promise.resolve({ value, document: new JSDOM().window.document }),
        );

      await expect(
        http.resolve('https://example.com/'),
      ).resolves.toStrictEqual<ResolveResult>({
        value,
        response: { status: res.status, headers: expect.any(Headers) },
      });

      expect(extractSpy).toHaveBeenCalledWith(
        res,
        expect.toBeOneOf([expect.any(Object), undefined]),
      );
    },
  );

  test.each([
    {
      contentType:
        'application/ld+json; profile="https://www.w3.org/ns/activitystreams"',
    },
    {
      contentType:
        'application/ld+json;profile="https://www.w3.org/ns/activitystreams"',
    },
    {
      contentType:
        'application/ld+json; profile="https://www.w3.org/ns/activitystreams"; charset=utf-8',
    },
    { contentType: 'application/activity+json' },
    { contentType: 'application/activity+json; charset=utf-8' },
  ])(
    'delegates Activity Streams responses to `activity-streams` extractor, Content-Type: $contentType',
    async ({ contentType }) => {
      const res = new Response(
        JSON.stringify({
          id: 'https://example.com/',
          description: 'Test object',
        }),
        {
          headers: {
            'content-type': contentType,
          },
        },
      );
      jest.spyOn(res, 'url', 'get').mockReturnValue('https://example.com/');
      jest.spyOn(global, 'fetch').mockReturnValueOnce(Promise.resolve(res));

      const value: as2.Metadata = {
        description: 'Test metadata',
        resolver: { activityStreams: { object: {} } },
      };
      const extractSpy = jest
        .spyOn(as2, 'extract')
        .mockReturnValueOnce(Promise.resolve(value));

      await expect(http.resolve('https://example.com/')).resolves.toStrictEqual<
        ResolveResult<as2.Metadata>
      >({
        value,
        response: { status: res.status, headers: expect.any(Headers) },
      });

      expect(extractSpy).toHaveBeenCalledWith(
        res,
        expect.toBeOneOf([expect.any(Object), undefined]),
      );
    },
  );

  it('falls back on filename from Content-Disposition header', async () => {
    const res = new Response('blob', {
      headers: {
        'content-disposition': "attachment; filename*=UTF-8'en'test.jpg",
        'content-type': 'image/jpeg',
      },
    });
    jest.spyOn(res, 'url', 'get').mockReturnValue('https://example.com/blob');
    jest.spyOn(global, 'fetch').mockReturnValueOnce(Promise.resolve(res));

    await expect(
      http.resolve('https://example.com/blob'),
    ).resolves.toStrictEqual<ResolveResult>({
      value: {
        name: { textValue: 'test.jpg' },
        image: [
          {
            contentUrl: 'https://example.com/blob',
            encodingFormat: 'image/jpeg',
          },
        ],
      },
      response: { status: res.status, headers: expect.any(Headers) },
    });
  });

  it('falls back on pathname', async () => {
    const res = new Response('blob', {
      headers: {
        'content-type': 'image/png',
      },
    });
    jest.spyOn(res, 'url', 'get').mockReturnValue('https://example.com/blob');
    jest.spyOn(global, 'fetch').mockReturnValueOnce(Promise.resolve(res));

    await expect(
      http.resolve('https://example.com/blob'),
    ).resolves.toStrictEqual<ResolveResult>({
      value: {
        name: { textValue: 'blob' },
        image: [
          {
            contentUrl: 'https://example.com/blob',
            encodingFormat: 'image/png',
          },
        ],
      },
      response: { status: res.status, headers: expect.any(Headers) },
    });
  });
});
