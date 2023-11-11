import { Hono } from 'hono';
import { cache } from 'hono/cache';
import { object, optional } from 'valibot';
import { ApiWordLettuceBindings } from '../util/env';
import { validateRequest } from '../util/validate';
import { gameNumSchema } from '../util/schemas';
import { getGameNum } from '../util/game-num';

const rankingsControllerV1 = new Hono<{ Bindings: ApiWordLettuceBindings }>();
const getRankingsRequestSchema = object({
	query: object({
		gameNum: optional(gameNumSchema, getGameNum)
	})
});
rankingsControllerV1.get(
	'/',
	cache({
		cacheName: 'api-wordlettuce-rankings',
		cacheControl: 'max-age=60'
	}),
	async (c) => {
		const data = await validateRequest(getRankingsRequestSchema, c);
		const { gameNum } = data.query;

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
			data: results,
			meta
		});
	}
);

export default rankingsControllerV1;

const rankingsControllerV2 = new Hono<{ Bindings: ApiWordLettuceBindings }>();
rankingsControllerV2.get(
	'/',
	cache({
		cacheName: 'api-wordlettuce-rankings-v2',
		cacheControl: 'max-age=60'
	}),
	async (c) => {
		const data = await validateRequest(getRankingsRequestSchema, c);
		const { gameNum } = data.query;

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

export { rankingsControllerV1, rankingsControllerV2 };
