import { Hono } from 'hono';
import * as v from 'valibot';
import { ApiWordLettuceBindings } from '../util/env';
import { vValidator } from '@hono/valibot-validator';
import { UsernameSchema, GameNumSchema, AnswerSchema, UserIdSchema } from '../util/schemas';
import { users, gameResults } from '../schema/drizzle';
import { drizzle } from 'drizzle-orm/d1';
import { desc, eq } from 'drizzle-orm';
const gameResultsController = new Hono<{ Bindings: ApiWordLettuceBindings }>();

const GetGameResultsQuerySchema = v.object({
	username: UsernameSchema,
	limit: v.pipe(
		v.optional(v.string(), '30'),
		v.transform((input) => Number(input)),
		v.integer(),
		v.minValue(1)
	),
	offset: v.pipe(
		v.optional(v.string(), '30'),
		v.transform((input) => Number(input)),
		v.integer(),
		v.minValue(0)
	)
});

gameResultsController.get('/', vValidator('query', GetGameResultsQuerySchema), async (c) => {
	const { username, limit, offset } = c.req.valid('query');
	const db = drizzle(c.env.WORDLETTUCE_DB);
	const query = db
		.select({
			gameNum: gameResults.gameNum,
			answers: gameResults.answers,
			userId: gameResults.userId,
			attempts: gameResults.attempts
		})
		.from(users)
		.innerJoin(gameResults, eq(users.id, gameResults.userId))
		.where(eq(users.username, username))
		.orderBy(desc(gameResults.gameNum))
		.limit(limit + 1)
		.offset(offset);
	const results = await query.all();
	return c.json({
		results: results.slice(0, limit),
		more: results.length > limit,
		limit,
		offset
	});
});

const CreateGameResultJsonSchema = v.object({
	gameNum: GameNumSchema,
	userId: UserIdSchema,
	answers: AnswerSchema
});

gameResultsController.post('/', vValidator('json', CreateGameResultJsonSchema), async (c) => {
	const { gameNum, userId, answers } = c.req.valid('json');
	const db = drizzle(c.env.WORDLETTUCE_DB);
	const attempts = answers.length / 5;
	const inserts = await db
		.insert(gameResults)
		.values({
			gameNum,
			userId,
			answers,
			attempts
		})
		.onConflictDoUpdate({
			target: [gameResults.userId, gameResults.gameNum],
			set: { answers, attempts }
		})
		.returning();
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
