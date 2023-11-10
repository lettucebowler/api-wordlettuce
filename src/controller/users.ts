import { Hono } from 'hono';
import { object, coerce } from 'valibot';
import { ApiWordLettuceBindings } from '../util/env';
import { validateRequest } from '../util/validate';
import { answerSchema, gameNumSchema, userIdSchema, usernameSchema } from '../util/schemas';

const userController = new Hono<{ Bindings: ApiWordLettuceBindings }>();

const upsertUserRequestSchema = object({
	param: object({
		userId: coerce(userIdSchema, Number)
	}),
	json: object({
		username: usernameSchema
	})
});
userController.put('/:userId', async (c) => {
	const data = await validateRequest(upsertUserRequestSchema, c);
	const { username } = data.json;
	const { userId } = data.param;
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

const createGameResultRequestSchema = object({
	param: object({
		userId: coerce(userIdSchema, Number),
		gameNum: coerce(gameNumSchema, Number)
	}),
	json: object({
		answers: answerSchema
	})
});
userController.put(':userId/game-results/:gameNum', async (c) => {
	const data = await validateRequest(createGameResultRequestSchema, c);
	const { userId, gameNum } = data.param;
	const { answers } = data.json;
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

export default userController;
