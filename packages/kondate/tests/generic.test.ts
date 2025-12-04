import * as kondate from '../src';
import { extensions, http } from '../src/resolvers/generic';

jest.mock(
  '../src/resolvers/generic/extensions',
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  () => ({
    _esModule: true,
    ...jest.requireActual('../src/resolvers/generic/extensions'),
  }),
);

jest.mock(
  '../src/resolvers/generic/http',
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  () => ({
    _esModule: true,
    ...jest.requireActual('../src/resolvers/generic/http'),
  }),
);

describe(kondate.resolve, () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('delegates known hosts to specific resolvers', async () => {
    const url = 'https://example.test/';

    const result: kondate.ResolveResult = {
      value: { description: 'Test metadata' },
    };
    const lookupSpy = jest
      .spyOn(extensions, 'lookup')
      .mockReturnValueOnce(() => result);

    await expect(
      kondate.resolve(url),
    ).resolves.toStrictEqual<kondate.ResolveResult>(result);

    expect(lookupSpy).toHaveBeenCalledWith(new URL(url));
  });

  it('delegates generic hosts to `http` extractor', async () => {
    const url = 'https://example.com/';

    const result: kondate.ResolveResult = {
      value: { description: 'Test metadata' },
    };
    const resolveSpy = jest
      .spyOn(http, 'resolve')
      .mockReturnValueOnce(Promise.resolve(result));

    await expect(
      kondate.resolve(url),
    ).resolves.toStrictEqual<kondate.ResolveResult>(result);

    expect(resolveSpy).toHaveBeenCalledWith(new URL(url), undefined);
  });
});
