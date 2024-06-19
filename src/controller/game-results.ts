import { Hono } from 'hono';
import * as v from 'valibot';
import { ApiWordLettuceBindings } from '../util/env';
import { vValidator } from '@hono/valibot-validator';
import {
	PositiveIntegerSchema,
	UsernameSchema,
	GameNumSchema,
	AnswerSchema,
	UserIdSchema
} from '../util/schemas';
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

const GameResultSchema = v.object({
	gameNum: PositiveIntegerSchema,
	answers: AnswerSchema,
	userId: UserIdSchema,
	attempts: PositiveIntegerSchema
});

gameResultsController.get('/', vValidator('query', GetGameResultsQuerySchema), async (c) => {
	const data = c.req.valid('query');
	const { username, limit, offset } = data;
	const query = c.env.WORDLETTUCE_DB.prepare(
		'select gamenum gameNum, answers, user_id userId, attempts from game_results a inner join users b on a.user_id = b.github_id where username = ?1 order by gamenum desc limit ?2 + 1 offset ?3'
	).bind(username, limit, offset);
	const queryResult = await query.all();
	if (!queryResult.success) {
		return c.json({
			success: false,
			message: 'Query failed.'
		});
	}
	const more = queryResult.results.length > limit;
	const gameResultsParseResult = v.safeParse(v.array(GameResultSchema), queryResult.results);
	if (!gameResultsParseResult.success) {
		console.log(gameResultsParseResult.issues.at(0));
		return c.json(
			{
				success: false,
				message: 'invalid data from db'
			},
			500
		);
	}
	return c.json({
		success: true,
		data: {
			results: gameResultsParseResult.output.slice(0, more ? -1 : undefined),
			more,
			limit,
			offset
		},
		meta: queryResult.meta
	});
});

const CreateGameResultJsonSchema = v.object({
	gameNum: GameNumSchema,
	userId: UserIdSchema,
	answers: AnswerSchema
});

gameResultsController.post('/', vValidator('json', CreateGameResultJsonSchema), async (c) => {
	const { gameNum, userId, answers } = c.req.valid('json');
	const query = c.env.WORDLETTUCE_DB.prepare(
		'INSERT INTO GAME_RESULTS (GAMENUM, USER_ID, ANSWERS, attempts) VALUES (?1, ?2, ?3, ?4) ON CONFLICT (USER_id, GAMENUM) DO UPDATE SET ANSWERS=?3, attempts=?4 returning gamenum gameNum, user_id userId, answers, attempts'
	).bind(gameNum, userId, answers.slice(-30), answers.length / 5);
	const createResult = await query.run();
	if (!createResult.success) {
		return c.json(
			{
				success: false
			},
			500
		);
	}
	return c.json({
		success: true,
		data: {
			gameNum,
			userId,
			answers
		}
	});
});
export default gameResultsController;
