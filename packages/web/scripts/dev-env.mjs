import { spawn } from 'node:child_process';
import console from 'node:console';
import process from 'node:process';

import { TID } from '@atproto/common-web';
import { Secp256k1Keypair } from '@atproto/crypto';
import { TestNetworkNoAppView } from '@atproto/dev-env';
import { cidForRecord } from '@atproto/repo';
import { createServiceAuthHeaders } from '@atproto/xrpc-server';
import * as plc from '@did-plc/lib';
import { comAtproto, orgOkazuDiary } from '@okazu-diary/api';

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  if (cmd === undefined) {
    throw new Error('Missing command argument');
  }

  const { network, did, accessJwt } = await setupNetwork();
  const client = network.pds.getClient();

  let mockTime = Date.parse('2025-01-01T00:00:00Z');
  function nextTID() {
    mockTime += 42 * 42 * 42 * 42 * 42; // ~1.5 day
    return TID.fromTime(mockTime * 1000, 1).toString();
  }

  // XXX: Cannot use `client.applyWrites` because of the `await` in array initialization.
  await client.xrpc(comAtproto.repo.applyWrites, {
    headers: { authorization: `Bearer ${accessJwt}` },
    body: {
      repo: did,
      writes: [
        {
          $type: 'com.atproto.repo.applyWrites#create',
          collection: orgOkazuDiary.actor.profile.$type,
          rkey: 'self',
          /** @type {orgOkazuDiary.actor.profile.Main} */
          value: {
            $type: orgOkazuDiary.actor.profile.$type,
            displayName: 'bobby',
            description: 'hi im bob',
            website: 'https://bob.test',
            lang: 'en',
            createdAt: /** @type {import('@atproto/syntax').DatetimeString} */ (
              new Date(mockTime).toISOString()
            ),
          },
        },
        ...Array(100)
          .fill(null)
          .map((_, i) => ({
            $type: /** @type {const} */ ('com.atproto.repo.applyWrites#create'),
            collection: orgOkazuDiary.feed.entry.$type,
            rkey: nextTID(),
            /** @type {orgOkazuDiary.feed.entry.Main} */
            value: {
              $type: orgOkazuDiary.feed.entry.$type,
              datetime: new Date(mockTime).toISOString(),
              note: `Placeholder to trigger pagination (${i})`,
              /** @type {comAtproto.label.defs.SelfLabels} */
              labels: {
                $type: 'com.atproto.label.defs#selfLabels',
                values: [{ val: 'sexual' }],
              },
              hadHiatus: false,
              visibility: 'public',
            },
          })),
        {
          $type: 'com.atproto.repo.applyWrites#create',
          collection: orgOkazuDiary.feed.entry.$type,
          rkey: nextTID(),
          /** @type {orgOkazuDiary.feed.entry.Main} */
          value: {
            $type: orgOkazuDiary.feed.entry.$type,
            datetime: new Date(mockTime).toISOString(),
            subjects: [],
            note: 'Entry with no subjects.',
            /** @type {comAtproto.label.defs.SelfLabels} */
            labels: {
              $type: 'com.atproto.label.defs#selfLabels',
              values: [{ val: 'sexual' }],
            },
            hadHiatus: false,
            visibility: 'public',
          },
        },
        ...(await (async () => {
          /** @satisfies {orgOkazuDiary.material.external.Main} */
          const material = {
            $type: orgOkazuDiary.material.external.$type,
            uri: 'https://en.example.com/',
            title: 'English Porn',
            thumb: {
              url: 'http://localhost:5173/favicon.ico',
            },
            tags: [
              {
                value: '日本語タグ',
                lang: 'ja',
              },
              {
                value: 'tag-without-lang',
              },
              {
                value: 'english-tag',
                lang: 'en',
              },
            ],
            lang: 'en',
          };
          const materialCid = await cidForRecord(material);
          const rkey = nextTID();
          return /** @type {comAtproto.repo.applyWrites.Create[]} */ ([
            {
              $type: 'com.atproto.repo.applyWrites#create',
              collection: material.$type,
              rkey,
              value: material,
            },
            {
              $type: /** @type {const} */ (
                'com.atproto.repo.applyWrites#create'
              ),
              collection: 'org.okazu-diary.feed.entry',
              rkey,
              /** @type {orgOkazuDiary.feed.entry.Main} */
              value: {
                $type: orgOkazuDiary.feed.entry.$type,
                datetime: new Date(mockTime).toISOString(),
                subjects: [
                  {
                    uri: `at://${did}/${material.$type}/${rkey}`,
                    cid: materialCid.toString(),
                  },
                ],
                tags: [
                  {
                    value: '日本語タグ',
                    lang: 'ja',
                  },
                  {
                    value: '言語未指定タグ',
                  },
                  {
                    value: 'english-tag-in-ja-entry',
                    lang: 'en',
                  },
                ],
                note: '日本語のエントリ',
                labels: {
                  $type: 'com.atproto.label.defs#selfLabels',
                  values: [{ val: 'sexual' }],
                },
                lang: 'ja',
                hadHiatus: false,
                visibility: 'public',
              },
            },
          ]);
        })()),
        ...(await (async () => {
          /** @satisfies {orgOkazuDiary.material.external.Main} */
          const material = {
            $type: orgOkazuDiary.material.external.$type,
            uri: 'https://example.com/',
            author: {
              uri: 'https://example.com/#author',
              name: 'Alice',
              avatar: {
                image: {
                  url: 'http://localhost:5173/favicon.ico',
                },
              },
            },
            title: 'Test material',
            description: 'This is a test material',
            thumb: {
              url: 'http://localhost:5173/favicon.ico',
            },
          };
          const materialCid = await cidForRecord(material);
          const rkey = nextTID();
          return /** @type {comAtproto.repo.applyWrites.Create[]} */ ([
            {
              $type: 'com.atproto.repo.applyWrites#create',
              collection: material.$type,
              rkey,
              value: material,
            },
            {
              $type: 'com.atproto.repo.applyWrites#create',
              collection: orgOkazuDiary.feed.entry.$type,
              rkey,
              /** @type {orgOkazuDiary.feed.entry.Main} */
              value: {
                $type: 'org.okazu-diary.feed.entry',
                datetime: new Date(mockTime).toISOString(),
                subjects: [
                  {
                    uri: `at://${did}/${material.$type}/${rkey}`,
                    cid: materialCid.toString(),
                  },
                ],
                tags: [{ value: 'tag-1' }, { value: 'tag-2' }],
                note: 'Hello',
                /** @type {comAtproto.label.defs.SelfLabels} */
                labels: {
                  $type: 'com.atproto.label.defs#selfLabels',
                  values: [{ val: 'sexual' }],
                },
                hadHiatus: false,
                visibility: 'public',
              },
            },
          ]);
        })()),
      ],
    },
  });

  console.log(
    `Test PLC server: ${network.plc.url}\n`,
    `Test PDS: ${network.pds.url}\n`,
    `Created test account: ${did}\n`,
  );

  const allowed_dids =
    process.env.VITE_OKAZU_DIARY_WEB_ALLOWED_DIDS?.trim().split(' ') ?? [];
  if (!allowed_dids.includes(did)) {
    allowed_dids.push(did);
  }

  const child = spawn(cmd, args, {
    stdio: 'inherit',
    env: {
      ...process.env,
      VITE_OKAZU_DIARY_WEB_ALLOWED_DIDS: allowed_dids.join(' '),
      VITE_OKAZU_DIARY_WEB_PLC:
        process.env.VITE_OKAZU_DIARY_WEB_PLC?.trim() || network.plc.url,
    },
  });

  /** @type {void} */
  const _ = await new Promise((resolve, reject) => {
    child.addListener('close', (code) => {
      process.exitCode = code;
      resolve();
    });
    child.addListener('error', (err) => {
      process.exitCode = 1;
      reject(err);
    });
  });

  await network.close();
}

/** @returns {Promise<{ network: TestNetworkNoAppView, did: string, accessJwt: string }>} */
async function setupNetwork() {
  const network = await TestNetworkNoAppView.create({
    pds: {
      port: 2583,
      hostname: 'localhost',
      enableDidDocWithSession: true,
    },
    plc: { port: 2587 },
  });
  const plcClient = new plc.Client(network.plc.url);
  const agent = network.pds.getAgent();

  const keypair = await Secp256k1Keypair.import(
    // https://github.com/bluesky-social/atproto/blob/a487ab8afe8f18d00662e666049be8d28de2b57e/packages/crypto/tests/did.test.ts#L52-L55
    '9085d2bef69286a6cbb51623c8fa258629945cd55ca705cc4e66700396894e0c',
  );
  const genesis = await plc.signOperation(
    {
      type: 'plc_operation',
      verificationMethods: { atproto: keypair.did() },
      rotationKeys: [keypair.did()],
      alsoKnownAs: [],
      services: {},
      prev: null,
    },
    keypair,
  );
  const did = await plc.didForCreateOp(genesis);

  await plcClient.sendOperation(did, genesis);

  const params = await createServiceAuthHeaders({
    iss: did,
    aud: (await agent.com.atproto.server.describeServer()).data.did,
    lxm: 'com.atproto.server.createAccount',
    keypair,
  });
  const {
    data: { accessJwt },
  } = await agent.com.atproto.server.createAccount(
    {
      email: 'bob@bob.test',
      handle: 'bob.test',
      did,
    },
    params,
  );

  const { data } =
    await agent.com.atproto.identity.getRecommendedDidCredentials(
      {},
      { headers: { authorization: `Bearer ${accessJwt}` } },
    );

  await plcClient.updateData(did, keypair, (prev) => ({
    ...prev,
    .../** @type {plc.UnsignedOperation} */ (data),
    rotationKeys: [
      ...new Set([...genesis.rotationKeys, ...(data.rotationKeys ?? [])]),
    ],
  }));

  await agent.com.atproto.server.activateAccount(undefined, {
    headers: { authorization: `Bearer ${accessJwt}` },
  });

  return { network, did, accessJwt };
}

await main();
