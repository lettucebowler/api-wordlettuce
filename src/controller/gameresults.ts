import { MiddlewareHandler } from 'hono';
import z from 'zod';

export const leaderboardRequestSchema = z.object({
	gamenum: z.preprocess((a) => parseInt(z.string().parse(a), 10), z.number().positive())
});

export const getInfoForLeaderboard: MiddlewareHandler = async (c) => {
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

export const saveGameResultRequestSchema = z.object({
	user_id: z.number(),
	answers: z.string()
});

export const saveGameResults: MiddlewareHandler = async (c) => {
	const { user_id, answers } = c.req.valid('json') as { user_id: number; answers: string };
	const gamenum = Number(c.req.param('gamenum'));
	const attempts = Math.floor(answers.toString().length / 5);
	const query = c.env.WORDLETTUCE_DB.prepare(
		'INSERT INTO GAME_RESULTS (GAMENUM, USER_ID, ANSWERS, ATTEMPTS) VALUES (?1, ?2, ?3, ?4) ON CONFLICT (USER_id, GAMENUM) DO UPDATE SET ANSWERS=?5, ATTEMPTS=?6'
	).bind(gamenum, user_id, answers.slice(-30), attempts, answers.slice(-30), attempts);
	const results = await query.run();

	const { success } = results;
	if (!success) {
		return c.text('oh no', 500);
	}

	return c.text('created', 201);
};
