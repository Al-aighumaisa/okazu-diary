import { html, http } from '../src/resolvers/generic';
import * as common from './common';

const fetchSpy = common.mockFetch('html');

afterEach(() => {
  fetchSpy.mockClear();
});

describe(html.extract, () => {
  test.each([
    {
      title: 'DLsite home',
      url: 'https://www.dlsite.com/home/work/=/product_id/RJ001016.html',
    },
    {
      title: 'DLsite maniax',
      url: 'https://www.dlsite.com/maniax/work/=/product_id/RJ001305.html',
    },
    {
      title: 'DLsite pro',
      url: 'https://www.dlsite.com/pro/work/=/product_id/VJ001001.html',
    },
    {
      title: 'DLsite soft',
      url: 'https://www.dlsite.com/soft/work/=/product_id/VJ001781.html',
    },
  ])('snapshot $title', async ({ url }) => {
    await expect(
      http.resolve(url).then(({ value }) => value),
    ).resolves.toMatchSnapshot();
  });
});
