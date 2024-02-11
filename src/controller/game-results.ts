import { Hono } from 'hono';
import { coerce, integer, number, object, optional } from 'valibot';
import { ApiWordLettuceBindings } from '../util/env';
import { validateRequest } from '../util/validate';
import {
	positiveInteger,
	usernameSchema,
	gameNumSchema,
	answerSchema,
	userIdSchema
} from '../util/schemas';
const gameResultsController = new Hono<{ Bindings: ApiWordLettuceBindings }>();
const getGameResultsRequestSchema = object({
	query: object({
		username: usernameSchema,
		limit: optional(coerce(positiveInteger, Number), 30),
		offset: optional(coerce(number([integer()]), Number), 0)
	})
});
gameResultsController.get('/', async (c) => {
	const data = await validateRequest(getGameResultsRequestSchema, c);
	const { username, limit, offset } = data.query;
	const query = c.env.WORDLETTUCE_DB.prepare(
		'select gamenum gameNum, answers, attempts from game_results a inner join users b on a.user_id = b.github_id where username = ?1 order by gamenum desc limit ?2 + 1 offset ?3'
	).bind(username, limit, offset);
	const queryResult = await query.all();
	if (!queryResult.success) {
		return c.json({
			success: false,
			message: 'Query failed.'
		});
	}
	const more = queryResult.results.length > limit;
	return c.json({
		success: true,
		data: {
			results: queryResult.results.slice(0, more ? -1 : undefined),
			more,
			limit,
			offset
		},
		meta: queryResult.meta
	});
});

const createGameResultRequestSchema = object({
	json: object({
		gameNum: gameNumSchema,
		userId: userIdSchema,
		answers: answerSchema
	})
});
gameResultsController.post('/', async (c) => {
	const data = await validateRequest(createGameResultRequestSchema, c);
	const { gameNum, userId, answers } = data.json;
	const query = c.env.WORDLETTUCE_DB.prepare(
		'INSERT INTO GAME_RESULTS (GAMENUM, USER_ID, ANSWERS, attempts) VALUES (?1, ?2, ?3, ?4) ON CONFLICT (USER_id, GAMENUM) DO UPDATE SET ANSWERS=?3, attempts=?4 returning gamenum gameNum, user_id userId, answers, attempts'
	).bind(gameNum, userId, answers.slice(-30), answers.length / 5);
	const createResult = await query.run();
	if (!createResult.success) {
		return c.json(
			{
				success: false,
				data: createResult
			},
			500
		);
	}
	const [created] = createResult.results;
	return c.json({
		success: true,
		data: created,
		meta: createResult.meta
	});
});
export default gameResultsController;
