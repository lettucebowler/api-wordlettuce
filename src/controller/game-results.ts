import { Hono } from 'hono';
import * as v from 'valibot';
import { ApiWordLettuceBindings } from '../util/env';
import { vValidator } from '@hono/valibot-validator';
import { Username, GameNumSchema, AnswerSchema, UserIdSchema } from '../util/schemas';
import { createGameResultsDao } from '../dao/game-results';
import { getGameNum } from '../util/game-num';
const gameResultsController = new Hono<{ Bindings: ApiWordLettuceBindings }>();

const GetGameResultsQuerySchema = v.object({
	username: Username,
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

gameResultsController.get('/', vValidator('query', GetGameResultsQuerySchema), async (c) => {
	const { username, limit, start } = c.req.valid('query');
	const { getNextPageAfter } = createGameResultsDao(c);

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

gameResultsController.post('/', vValidator('json', CreateGameResultJsonSchema), async (c) => {
	const { gameNum, userId, answers } = c.req.valid('json');
	const { saveGame } = createGameResultsDao(c);
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
});
export default gameResultsController;
