import { Hono } from 'hono';
import { cache } from 'hono/cache';
import * as v from 'valibot';
import { ApiWordLettuceBindings } from '../util/env';
import { GameNumSchema } from '../util/schemas';
import { getGameNum } from '../util/game-num';
import { vValidator } from '@hono/valibot-validator';

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
	cache({
		cacheName: 'api-wordlettuce-rankings-v2',
		cacheControl: 'max-age=60'
	}),
	vValidator('query', GetRankingsQuerySchema),
	async (c) => {
		const { gameNum } = c.req.valid('query');

		const query = c.env.WORDLETTUCE_DB.prepare(
			`SELECT USERNAME user, COUNT(ATTEMPTS) games, count(attempts) + sum(max(0, 6 - attempts)) score FROM game_results a inner join users b on a.user_id = b.github_id WHERE GAMENUM > ?1 - 7 AND GAMENUM <= ?1 GROUP BY USER_id ORDER BY score DESC LIMIT 10`
		).bind(gameNum);
		const { success, results, meta } = await query.all();
		if (!success) {
			return c.json(
				{
					success: false,
					message: 'Query failed.'
				},
				500
			);
		}
		return c.json({
			success: true,
			data: {
				rankings: results
			},
			meta
		});
	}
);

export { rankingsControllerV2 };
