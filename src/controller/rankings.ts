import { Hono } from 'hono';
import { object, optional } from 'valibot';
import { ApiWordLettuceBindings } from '../util/env';
import { validate } from '../util/validate';
import { gameNumSchema } from '../util/schemas';
import { getGameNum } from '../util/game-num';

const rankingsController = new Hono<{ Bindings: ApiWordLettuceBindings }>();

const getRankingsQuerySchema = object({
	gameNum: optional(gameNumSchema, getGameNum)
});
rankingsController.get('/', async (c) => {
	const { gameNum } = validate(c, getRankingsQuerySchema, c.req.query());

	const query = c.env.WORDLETTUCE_DB.prepare(
		`SELECT USERNAME user, COUNT(ATTEMPTS) games, count(attempts) + sum(min(0, 6 - attempts)) score FROM game_results a inner join users b on a.user_id = b.github_id WHERE GAMENUM > ?1 - 7 AND GAMENUM <= ?1 GROUP BY USER_id ORDER BY score DESC LIMIT 10`
	).bind(gameNum);
	const { success, results, meta } = await query.all();
	if (!success) {
		return c.json(
			{
				success: false,
				message: 'Query failed.'
			},
			500
		);
	}
	return c.json({
		success: true,
		data: results,
		meta
	});
});

export default rankingsController;
