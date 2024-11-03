import { Hono } from 'hono';
import * as v from 'valibot';
import { ApiWordLettuceBindings } from '../util/env';
import { UserIdSchema, Username } from '../util/schemas';
import { vValidator } from '@hono/valibot-validator';
import { createGameResultsDao } from '../dao/game-results';
import { createUserDao } from '../dao/user';

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

const CreateUserRequestJson = v.object({
	username: Username,
	githubId: v.pipe(v.number(), v.integer()),
	email: v.pipe(v.string(), v.email())
});

usersController.post('/', vValidator('json', CreateUserRequestJson), async (c) => {
	const { username, githubId, email } = c.req.valid('json');
	const { upsertUser } = createUserDao(c);
	try {
		const user = await upsertUser({ username, githubId, email });
		return c.json(user, 201);
	} catch (e) {
		return c.json(
			{
				message: 'Create failed.'
			},
			500
		);
	}
});

const GetUserByGithubIdParams = v.object({
	githubId: v.pipe(v.number(), v.integer())
});

usersController.get(
	'/github/:githubId',
	vValidator('param', GetUserByGithubIdParams),
	async (c) => {
		const { githubId } = c.req.valid('param');
		const { getUserFromGitHubId } = createUserDao(c);
		try {
			const user = await getUserFromGitHubId({ githubId });
			if (!user) {
				return c.json(
					{
						message: 'user not found'
					},
					404
				);
			}
			return c.json(user);
		} catch (e) {
			return c.json(
				{
					success: false,
					message: 'Cannot get user'
				},
				500
			);
		}
	}
);

export default usersController;
