/* eslint-disable no-console */
import { NotFoundError } from '@/utils/errors';

import { EmbedOutput, makeEmbed } from '../base';

const ANIMETSU_SERVERS = ['pahe', 'zoro', 'zaza', 'meg', 'bato'] as const;

const baseUrl = 'https://backend.animetsu.to';
const headers = {
  referer: 'https://animetsu.to/',
  origin: 'https://backend.animetsu.to',
  accept: 'application/json, text/plain, */*',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
};

export function makeAnimetsuEmbed(id: string, rank: number = 100) {
  return makeEmbed({
    id: `animetsu-${id}`,
    name: `${id.charAt(0).toUpperCase() + id.slice(1)}`,
    rank,
    async scrape(ctx): Promise<EmbedOutput> {
      const serverName = id as (typeof ANIMETSU_SERVERS)[number];

      const query = JSON.parse(ctx.url);
      const { type, anilistId, episode } = query;

      if (type !== 'movie' && type !== 'show') {
        throw new NotFoundError('Unsupported media type');
      }

      const res = await ctx.proxiedFetcher(`/api/anime/tiddies`, {
        baseUrl,
        headers,
        query: {
          server: serverName,
          id: String(anilistId),
          num: String(episode ?? 1),
          subType: 'dub',
        },
      });

      console.log('Animetsu API Response:', JSON.stringify(res, null, 2));

      const source = res?.sources?.[0];
      if (!source?.url) throw new NotFoundError('No source URL found');

      const streamUrl = source.url;
      const sourceType = source.type;
      const sourceQuality = source.quality;

      let streamHeaders = { ...headers };

      // change headers if the url has backend.animetsu.cc bc they tried to make it harder
      if (streamUrl.includes('animetsu.cc')) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { referer, origin, ...restHeaders } = streamHeaders;

        streamHeaders = {
          ...restHeaders,
          origin: 'https://backend.animetsu.cc',
          referer: 'https://backend.animetsu.cc/',
        };
      }

      ctx.progress(100);

      if (sourceType === 'mp4') {
        let qualityKey: string | number = 'unknown';
        if (sourceQuality) {
          const qualityMatch = sourceQuality.match(/(\d+)p?/);
          if (qualityMatch) {
            qualityKey = parseInt(qualityMatch[1], 10);
          }
        }

        return {
          stream: [
            {
              id: 'primary',
              captions: [],
              qualities: {
                [qualityKey]: {
                  type: 'mp4',
                  url: streamUrl,
                },
              },
              type: 'file',
              headers: streamHeaders,
              flags: [],
            },
          ],
        };
      }

      return {
        stream: [
          {
            id: 'primary',
            type: 'hls',
            playlist: streamUrl,
            headers: streamHeaders,
            flags: [],
            captions: [],
          },
        ],
      };
    },
  });
}

export const AnimetsuEmbeds = ANIMETSU_SERVERS.map((server, i) => makeAnimetsuEmbed(server, 300 - i));
