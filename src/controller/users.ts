import { Hono } from 'hono';
import * as v from 'valibot';
import { ApiWordLettuceBindings } from '../util/env';
import { UserIdSchema, Username } from '../util/schemas';
import { vValidator } from '@hono/valibot-validator';
import { createGameResultsDao } from '../dao/game-results';

const usersController = new Hono<{ Bindings: ApiWordLettuceBindings }>();

const UpsertUserJsonSchema = v.object({
	username: Username
});
const UpserUserParamSchema = v.object({
	userId: v.pipe(v.string(), v.transform(Number), UserIdSchema)
});

usersController.put(
	'/:userId',
	vValidator('json', UpsertUserJsonSchema),
	vValidator('param', UpserUserParamSchema),
	async (c) => {
		const { username } = c.req.valid('json');
		const { userId } = c.req.valid('param');
		const { upsertUser } = createGameResultsDao(c);
		const inserts = await upsertUser({ username, userId });
		if (!inserts.length) {
			return c.json(
				{
					message: 'Create failed.'
				},
				500
			);
		}
		return c.json(inserts.at(0));
	}
);

export default usersController;
