import { Hono } from 'hono';
import { coerce, integer, number, object, optional } from 'valibot';
import { ApiWordLettuceBindings } from '../util/env';
import { validate } from '../util/validate';
import { positiveInteger, usernameSchema } from '../util/schemas';

const gameResultsController = new Hono<{ Bindings: ApiWordLettuceBindings }>();

const getGameResultsQuerySchema = object({
	username: usernameSchema,
	limit: optional(coerce(positiveInteger, Number), 30),
	offset: optional(coerce(number([integer()]), Number), 0)
});
gameResultsController.get('/', async (c) => {
	const { username, limit, offset } = validate(c, getGameResultsQuerySchema, c.req.query());
	const query = c.env.WORDLETTUCE_DB.prepare(
		'select gamenum gameNum, answers, attempts from game_results a inner join users b on a.user_id = b.github_id where username = ?1 order by gamenum desc limit ?2 + 1 offset ?3'
	).bind(username, limit, offset);
	const queryResult = await query.all();
	if (!queryResult.success) {
		return c.json({
			success: false,
			message: 'Query failed.'
		});
	}
	const more = queryResult.results.length > limit;
	return c.json({
		success: true,
		data: {
			results: queryResult.results.slice(0, more ? -1 : undefined),
			more
		},
		meta: queryResult.meta
	});
});
export default gameResultsController;
