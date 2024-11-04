import { Hono } from 'hono';
import * as v from 'valibot';
import { ApiWordLettuceBindings } from '../util/env';
import { GameNumSchema } from '../util/schemas';
import { getGameNum } from '../util/game-num';
import { vValidator } from '@hono/valibot-validator';
import { createGameResultDao } from '../dao/gameresult';

const rankingsControllerV3 = new Hono<{ Bindings: ApiWordLettuceBindings }>();

const GetRankingsQuerySchema = v.object({
	gameNum: v.pipe(
		v.optional(v.string(), () => getGameNum().toString()),
		v.transform((input) => Number(input)),
		GameNumSchema
	)
});

rankingsControllerV3.get('/', vValidator('query', GetRankingsQuerySchema), async (c) => {
	const { getRankings } = createGameResultDao(c);
	const results = await getRankings();
	return c.json({
		rankings: results
	});
});

export { rankingsControllerV3 };
