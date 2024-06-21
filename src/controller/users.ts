import { Hono } from 'hono';
import * as v from 'valibot';
import { ApiWordLettuceBindings } from '../util/env';
import { UserIdSchema, UsernameSchema } from '../util/schemas';
import { vValidator } from '@hono/valibot-validator';
import { IdentitySchema } from '../schemas';

const userController = new Hono<{ Bindings: ApiWordLettuceBindings }>();

const UpsertUserJsonSchema = v.object({
	username: UsernameSchema
});
const UpserUserParamSchema = v.object({
	userId: v.pipe(v.string(), v.transform(Number), UserIdSchema)
});

userController.put(
	'/:userId',
	vValidator('json', UpsertUserJsonSchema),
	vValidator('param', UpserUserParamSchema),
	async (c) => {
		const { username } = c.req.valid('json');
		const { userId } = c.req.valid('param');
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
	}
);

export default userController;
