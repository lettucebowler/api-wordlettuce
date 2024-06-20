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

const getUsersQuerySchema = v.object({
	provider: v.string(),
	providerId: v.string()
});
function mapIdentitiesToUser(identities: Array<v.InferOutput<typeof IdentitySchema>>) {
	const [first] = identities;
	if (!first) {
		throw new Error('Oh no!');
	}

	let user: {
		id: number;
		username: string;
		email: string;
		identities: Array<{ provider: string; id: string }>;
	} = {
		id: first.personaId,
		username: first.username,
		email: first.email,
		identities: identities.map((identity) => {
			return {
				provider: identity.provider,
				id: identity.providerId
			};
		})
	};
	return user;
}
userController.get('', vValidator('query', getUsersQuerySchema), async (c) => {
	const { provider, providerId } = c.req.valid('query');
	const query = c.env.WORDLETTUCE_DB.prepare(
		'select id as persona_id, username, email, provider, provider_id from personas p inner join identities i on p.id = i.persona_id where provider = ?1 and provider_id = ?2'
	).bind(provider, providerId);
	const { results, meta } = await query.all();
	const identities = v.safeParse(v.array(IdentitySchema), results);
	if (!identities.success) {
		return c.json(
			{
				message: 'Invalid data from db'
			},
			500
		);
	}
	const users = Object.values(
		Object.groupBy(identities.output, (identity) => identity.personaId)
	).map((identities) => mapIdentitiesToUser(identities ?? []));
	return c.json({
		users,
		meta
	});
});

export default userController;
