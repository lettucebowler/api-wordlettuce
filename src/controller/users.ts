import { Hono } from 'hono';
import * as v from 'valibot';
import { ApiWordLettuceBindings } from '../util/env';
import { UserIdSchema, UsernameSchema } from '../util/schemas';
import { vValidator } from '@hono/valibot-validator';
import { createDbClient } from '../dao/wordlettuce-db';

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
		const { upsertUser } = createDbClient(c);
		const inserts = await upsertUser({ username, userId });
		if (!inserts.length) {
			return c.json(
				{
					success: false,
					message: 'Create failed.'
				},
				500
			);
		}
		return c.json(inserts.at(0));
	}
);

export default userController;
