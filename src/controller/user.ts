import { MiddlewareHandler } from 'hono';
import { z } from 'zod';

export const userSchema = z.object({
	username: z.string(),
	github_id: z.number()
});

export const upsertUser: MiddlewareHandler = async (c) => {
	const { username, github_id } = c.req.valid('json');
	const query = c.env.WORDLETTUCE_DB.prepare(
		'insert into users (github_id, username) values (?1, ?2) on conflict (github_id) do update set username = ?3'
	).bind(github_id, username, username);
	const results = await query.run();
	const { success } = results;
	if (!success) {
		return c.text('oh no', 500);
	}

	return c.text('created', 201);
};
