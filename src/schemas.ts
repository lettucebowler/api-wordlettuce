import * as v from 'valibot';

export const PersonaIdSchema = v.pipe(v.number(), v.integer(), v.minValue(1));

export const IdentitySchema = v.pipe(
	v.object({
		persona_id: PersonaIdSchema,
		username: v.string(),
		email: v.pipe(v.string(), v.email()),
		provider: v.string(),
		provider_id: v.string()
	}),
	v.transform((input) => {
		return {
			provider: input.provider,
			providerId: input.provider_id,
			email: input.email,
			username: input.username,
			personaId: input.persona_id
		};
	})
);
