import { MiddlewareHandler } from 'hono';
import { validator } from 'hono/validator';

export const getGameResults: MiddlewareHandler = async (c) => {
	const user = c.req.param('user');
	const count = c.req.query('count');
	const limit = count ? count : 30;
	const query = c.env.WORDLETTUCE_DB.prepare(
		'SELECT gamenum, username, answers, attempts FROM game_results inner join users WHERE USERNAME = ?1 ORDER BY GAMENUM LIMIT ?2'
	).bind(user, limit);
	const stuff = await query.all();
	const { success, results } = stuff;
	if (!success) {
		return c.text('oh no', 500);
	}
	const mapped = results.map((row) => {
		const [gamenum, user, answers, attempts] = Object.values(row);
		return {
			gamenum,
			user,
			answers,
			attempts
		};
	});
	return c.json(mapped);
};

export const validateGetInfoForLeaderboardRequest = validator((v) => ({
	gamenum: v.query('gamenum').isNumeric().isRequired()
}));

export const getInfoForLeaderboard: MiddlewareHandler = async (c) => {
	const gamenum = parseInt(`${c.req.valid().gamenum}`);
	const query = c.env.WORDLETTUCE_DB.prepare(
		`SELECT USERNAME, SUM(ATTEMPTS), COUNT(ATTEMPTS), (COUNT(ATTEMPTS) * 7) - SUM(ATTEMPTS) FROM GAME_RESULTS inner join USERS WHERE GAMENUM > ?1 AND GAMENUM <= ?2 GROUP BY USER_id ORDER BY (COUNT(ATTEMPTS) * 7) - SUM(ATTEMPTS) DESC LIMIT 10`
	).bind(gamenum - 7, gamenum);
	const { success, results } = await query.all();

	if (!success) {
		return c.text('oh no', 500);
	}

	const mapped = results.map((row) => {
		const [user, sum, count, score] = Object.values(row);
		return {
			user,
			sum,
			count,
			score
		};
	});
	return c.json(mapped);
};

export const validateSaveGameResultsRequest = validator((v) => ({
	gamenum: v.json('gamenum').asNumber().isRequired(),
	user: v.json('user_id').asNumber().isRequired(),
	answers: v.json('answers').isRequired()
}));

export const saveGameResults: MiddlewareHandler = async (c) => {
	const { user, gamenum, answers } = c.req.valid();
	const attempts = Math.floor(answers.toString().length / 5);
	const query = c.env.WORDLETTUCE_DB.prepare(
		'INSERT INTO GAME_RESULTS (GAMENUM, USER_ID, ANSWERS, ATTEMPTS) VALUES (?1, ?2, ?3, ?4) ON CONFLICT (USER_id, GAMENUM) DO UPDATE SET ANSWERS=?5, ATTEMPTS=?6'
	).bind(gamenum, user, answers, attempts, answers, attempts);
	const results = await query.run();
	console.log('results', results);

	const { success } = results;
	if (!success) {
		return c.text('oh no', 500);
	}

	return c.text('created', 201);
};
