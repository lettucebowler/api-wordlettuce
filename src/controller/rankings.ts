import { MiddlewareHandler } from 'hono';
import z from 'zod';

export const getRankingsRequestSchema = z.object({
	gamenum: z.preprocess((a) => parseInt(z.string().parse(a), 10), z.number().positive())
});

export const getRankings: MiddlewareHandler = async (c) => {
	const { gamenum } = c.req.valid('query');
	const wordlettuceDatabase = c.env.WORDLETTUCE_DB;
	const query = wordlettuceDatabase
		.prepare(
			`SELECT USERNAME user, GITHUB_ID userId, SUM(ATTEMPTS) sum, COUNT(ATTEMPTS) count, count(attempts) + sum(case when attempts >= 6 then 0 else 6 - attempts end) score FROM game_results a inner join users b on a.user_id = b.github_id WHERE GAMENUM > ?1 AND GAMENUM <= ?2 GROUP BY USER_id ORDER BY score DESC, USERNAME LIMIT 10`
		)
		.bind(gamenum - 7, gamenum);
	const { success, results } = await query.all();

	if (!success) {
		return c.text('oh no', 500);
	}

	return c.json(results);
};
