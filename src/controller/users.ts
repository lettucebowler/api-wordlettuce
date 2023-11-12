import { Hono } from 'hono';
import { object, coerce } from 'valibot';
import { ApiWordLettuceBindings } from '../util/env';
import { validateRequest } from '../util/validate';
import { userIdSchema, usernameSchema } from '../util/schemas';

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

export default userController;
