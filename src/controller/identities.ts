import { Hono } from 'hono';
import * as v from 'valibot';
import { ApiWordLettuceBindings } from '../util/env';
import { vValidator } from '@hono/valibot-validator';
import { PersonaIdSchema } from '../schemas';

const identitiesController = new Hono<{ Bindings: ApiWordLettuceBindings }>();

const GetIdentityParamSchema = v.object({
	provider: v.string(),
	providerId: v.string()
});
const IdentitySchema = v.pipe(
	v.object({
		personaId: v.pipe(v.number(), v.integer(), v.minValue(1)),
		username: v.string(),
		email: v.nullable(v.string()),
		provider: v.string(),
		providerId: v.string()
	}),
	v.transform((input) => {
		return {
			id: input.personaId,
			email: input.email,
			username: input.username,
			identity: {
				provider: input.provider,
				providerId: input.providerId
			}
		};
	})
);
identitiesController.get(
	'/:provider/identities/:providerId',
	vValidator('param', GetIdentityParamSchema),
	async (c) => {
		const { provider, providerId } = c.req.valid('param');
		const query = c.env.WORDLETTUCE_DB.prepare(
			'select i.persona_id as personaId, p.username, p.email, i.provider, i.provider_id as providerId from personas p inner join identities i on i.persona_id = p.id where i.provider = ?1 and i.provider_id = ?2'
		).bind(provider, providerId);
		const { success, meta, results } = await query.all();

		if (!success) {
			return c.json(
				{
					message: 'DB communication error.'
				},
				500
			);
		}
		if (!results.length) {
			return c.json(
				{
					message: 'Not Found'
				},
				404
			);
		}

		const identityParseResult = v.safeParse(IdentitySchema, results.at(0));

		if (!identityParseResult.success) {
			return c.json(
				{
					message: 'Invalid data in db',
					issues: identityParseResult.issues
				},
				500
			);
		}

		return c.json({
			meta,
			persona: identityParseResult.output
		});
	}
);

export default identitiesController;
