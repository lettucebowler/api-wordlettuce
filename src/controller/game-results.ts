import { Hono } from 'hono';
import * as v from 'valibot';
import { ApiWordLettuceBindings } from '../util/env';
import { vValidator } from '@hono/valibot-validator';
import { UsernameSchema, GameNumSchema, AnswerSchema, UserIdSchema } from '../util/schemas';
import { createDbClient } from '../dao/wordlettuce-db';
import { getGameNum } from '../util/game-num';
import { requireToken } from '../middleware/requireToken';
import { cache } from 'hono/cache';
const gameResultsController = new Hono<{ Bindings: ApiWordLettuceBindings }>();

const GetGameResultsQuerySchema = v.object({
	username: UsernameSchema,
	limit: v.pipe(
		v.optional(v.string(), '30'),
		v.transform((input) => Number(input)),
		v.integer(),
		v.minValue(1)
	),
	start: v.pipe(
		v.optional(v.string(), () => getGameNum().toString()),
		v.transform((input) => Number(input)),
		v.integer(),
		v.minValue(0)
	)
});

gameResultsController.get(
	'/',
	cache({
		cacheName: 'api-wordlettuce-game-results-v2',
		cacheControl: 'max-age=60'
	}),
	vValidator('query', GetGameResultsQuerySchema),
	async (c) => {
		const { username, limit, start } = c.req.valid('query');
		const { getNextPageAfter } = createDbClient(c);

		const { results, next } = await getNextPageAfter({ username, limit, start });
		return c.json({
			results: results.slice(0, limit),
			next,
			limit,
			start
		});
	});

const CreateGameResultJsonSchema = v.object({
	gameNum: GameNumSchema,
	userId: UserIdSchema,
	answers: AnswerSchema
});

gameResultsController.post(
	'/',
	requireToken,
	vValidator('json', CreateGameResultJsonSchema),
	async (c) => {
		const { gameNum, userId, answers } = c.req.valid('json');
		const { saveGame } = createDbClient(c);
		const inserts = await saveGame({ gameNum, userId, answers });
		if (!inserts.length) {
			return c.json(
				{
					success: false
				},
				500
			);
		}
		return c.json(inserts.at(0));
	}
);
export default gameResultsController;
