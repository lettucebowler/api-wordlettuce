import { Hono } from 'hono';
import { cache } from 'hono/cache';
import * as v from 'valibot';
import { ApiWordLettuceBindings } from '../util/env';
import { GameNumSchema } from '../util/schemas';
import { getGameNum } from '../util/game-num';
import { vValidator } from '@hono/valibot-validator';
import { drizzle } from 'drizzle-orm/d1';
import { gameResults, users } from '../schema/drizzle';
import { and, count, desc, eq, gt, lte, sql } from 'drizzle-orm';

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
		const db = drizzle(c.env.WORDLETTUCE_DB);
		const query = db
			.select({
				user: users.username,
				games: count(gameResults.attempts),
				score: sql`count(${gameResults.attempts}) + sum(max(0, 6 - ${gameResults.attempts}))`
					.mapWith(Number)
					.as('score')
			})
			.from(users)
			.innerJoin(gameResults, eq(users.id, gameResults.userId))
			.where(and(gt(gameResults.gameNum, gameNum - 7), lte(gameResults.gameNum, gameNum)))
			.groupBy(users.id)
			.orderBy(desc(sql`score`))
			.limit(10);
		const results = await query.all();
		return c.json({
			rankings: results
		});
	}
);

export { rankingsControllerV2 };
