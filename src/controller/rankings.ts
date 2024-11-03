import { Hono } from 'hono';
import * as v from 'valibot';
import { ApiWordLettuceBindings } from '../util/env';
import { GameNumSchema } from '../util/schemas';
import { getGameNum } from '../util/game-num';
import { vValidator } from '@hono/valibot-validator';
import { createGameResultsDao } from '../dao/game-results';

const rankingsControllerV2 = new Hono<{ Bindings: ApiWordLettuceBindings }>();

const GetRankingsQuerySchema = v.object({
	gameNum: v.pipe(
		v.optional(v.string(), () => getGameNum().toString()),
		v.transform((input) => Number(input)),
		GameNumSchema
	)
});

rankingsControllerV2.get('/', vValidator('query', GetRankingsQuerySchema), async (c) => {
	const { getRankings } = createGameResultsDao(c);
	const results = await getRankings();
	return c.json({
		rankings: results
	});
});

export { rankingsControllerV2 };
