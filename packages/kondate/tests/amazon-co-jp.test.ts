import { resolvers } from '../src';
import * as common from './common';

const fetchSpy = common.mockFetch('amazon-co-jp');

afterEach(() => {
  fetchSpy.mockClear();
});

describe(resolvers.amazonCoJp.resolve, () => {
  test.each([
    {
      title: 'general-dirty-url',
      asin: 'B07KZ4MVLJ',
      url: 'https://www.amazon.co.jp/-/en/%E3%81%91%E3%82%82%E3%81%AE%E3%83%95%E3%83%AC%E3%83%B3%E3%82%BA%E3%83%97%E3%83%AD%E3%82%B8%E3%82%A7%E3%82%AF%E3%83%88A/dp/B07KZ4MVLJ/ref=pd_sbs_d_sccl_1_2/355-5527824-7457021',
    },
    {
      title: 'general-clean-url',
      asin: 'B07PDLJV5W',
      url: 'https://www.amazon.co.jp/dp/B07PDLJV5W',
    },
    {
      title: 'adult',
      asin: 'B00LE7TO0K',
      url: 'https://www.amazon.co.jp/%E3%83%9A%E3%83%9A-%E3%83%9A%E3%83%9A%E3%83%AD%E3%83%BC%E3%82%B7%E3%83%A7%E3%83%B3-435ml/dp/B00LE7TO0K/',
      adult: true,
    },
  ])('snapshot $title', async ({ asin, url, adult }) => {
    await expect(
      resolvers.amazonCoJp.resolve(url).then(({ value }) => value),
    ).resolves.toMatchSnapshot();

    const expectedCalls = [
      [`https://www.amazon.co.jp/dp/${asin}`, expect.any(Object)],
    ];
    if (adult) {
      expectedCalls.push(
        [
          `https://www.amazon.co.jp/-/ja/black-curtain/save-eligibility/black-curtain?returnUrl=%2Fdp%2F${asin}`,
          expect.any(Object),
        ],
        [
          `https://www.amazon.co.jp/dp/${asin}`,
          expect.objectContaining<RequestInit>({
            headers: expect.toSatisfy(
              (headers: RequestInit['headers']) =>
                new Headers(headers).get('cookie')?.includes('session-id=') ??
                false,
            ),
          }),
        ],
      );
    }
    expect(fetchSpy.mock.calls).toStrictEqual(expectedCalls);
  });

  it('snapshot 404', async () => {
    await expect(
      resolvers.amazonCoJp.resolve('https://www.amazon.co.jp/dp/404404404/'),
    ).resolves.toMatchSnapshot();
  });
});
