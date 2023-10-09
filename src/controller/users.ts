import { Hono } from 'hono';
import { object, coerce } from 'valibot';
import { ApiWordLettuceBindings } from '../util/env';
import { validate } from '../util/validate';
import { answerSchema, gameNumSchema, userIdSchema, usernameSchema } from '../util/schemas';

const userController = new Hono<{ Bindings: ApiWordLettuceBindings }>();

const upserUserParamsSchema = object({
	userId: coerce(userIdSchema, Number)
});
const upserUserBodySchema = object({
	username: usernameSchema
});
userController.put('/:userId', async (c) => {
	const params = validate(c, upserUserParamsSchema, c.req.param());
	const body = validate(c, upserUserBodySchema, await c.req.json());
	const { username } = body;
	const { userId } = params;
	const query = c.env.WORDLETTUCE_DB.prepare(
		'insert into users (github_id, username) values (?1, ?2) on conflict do update set username = ?2'
	).bind(userId, username);
	const { success, meta } = await query.run();
	if (!success) {
		return c.json(
			{
				success: false,
				message: 'Create failed.'
			},
			500
		);
	}
	return c.json({
		success: true,
		data: {
			userId,
			username
		},
		meta
	});
});

const createGameResultParamsSchema = object({
	userId: coerce(userIdSchema, Number),
	gameNum: coerce(gameNumSchema, Number)
});

const createGameResultBodySchema = object({
	answers: answerSchema
});
userController.put(':userId/game-results/:gameNum', async (c) => {
	const { userId, gameNum } = validate(c, createGameResultParamsSchema, c.req.param());
	const { answers } = validate(c, createGameResultBodySchema, await c.req.json());
	const query = c.env.WORDLETTUCE_DB.prepare(
		'INSERT INTO GAME_RESULTS (GAMENUM, USER_ID, ANSWERS, attempts) VALUES (?1, ?2, ?3, ?4) ON CONFLICT (USER_id, GAMENUM) DO UPDATE SET ANSWERS=?3, attempts=?4 returning *'
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

export default userController;
