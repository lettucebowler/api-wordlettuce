import { Hono } from 'hono';
import { cache } from 'hono/cache';
import * as v from 'valibot';
import { ApiWordLettuceBindings } from '../util/env';
import { GameNumSchema } from '../util/schemas';
import { getGameNum } from '../util/game-num';
import { vValidator } from '@hono/valibot-validator';
import { createDbClient } from '../dao/wordlettuce-db';

const rankingsControllerV2 = new Hono<{ Bindings: ApiWordLettuceBindings }>();

const GetRankingsQuerySchema = v.object({
	gameNum: v.pipe(
		v.optional(v.string(), () => getGameNum().toString()),
		v.transform((input) => Number(input)),
		GameNumSchema
	)
});

rankingsControllerV2.get(
	'/',
	// cache({
	// 	cacheName: 'api-wordlettuce-rankings-v2',
	// 	cacheControl: 'max-age=60'
	// }),
	vValidator('query', GetRankingsQuerySchema),
	async (c) => {
		const { getRankings } = createDbClient(c);
		const results = await getRankings();
		return c.json({
			rankings: results
		});
	}
);

export { rankingsControllerV2 };
