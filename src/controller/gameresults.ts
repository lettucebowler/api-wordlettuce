import { MiddlewareHandler } from 'hono';
import { validator } from 'hono/validator';

export const getGameResults: MiddlewareHandler = async (c) => {
	const user = c.req.param('user');
	const count = c.req.query('count');
	const limit = count ? count : 30;
	const query = c.env.DB.prepare(
		'SELECT * FROM GAMERESULTS WHERE USER = ?1 ORDER BY GAMENUM LIMIT ?2'
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
	const query = c.env.DB.prepare(
		`SELECT USER, SUM(ATTEMPTS), COUNT(ATTEMPTS), (COUNT(ATTEMPTS) * 7) - SUM(ATTEMPTS) FROM GAMERESULTS WHERE GAMENUM > ?1 AND GAMENUM <= ?2 GROUP BY USER ORDER BY (COUNT(ATTEMPTS) * 7) - SUM(ATTEMPTS) DESC LIMIT 10`
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
	user: v.json('user').isRequired(),
	answers: v.json('answers').isRequired()
}));

export const saveGameResults: MiddlewareHandler = async (c) => {
	const { user, gamenum, answers } = c.req.valid();
	const attempts = Math.floor(answers.toString().length / 5);
	const query = c.env.DB.prepare(
		'INSERT INTO GAMERESULTS (GAMENUM, USER, ANSWERS, ATTEMPTS) VALUES (?1, ?2, ?3, ?4) ON CONFLICT (USER, GAMENUM) DO UPDATE SET ANSWERS=?5, ATTEMPTS=?6'
	).bind(gamenum, user, answers, attempts, answers, attempts);
	const results = await query.run();
	console.log('results', results);

	const { success } = results;
	if (!success) {
		return c.text('oh no', 500);
	}

	return c.text('created', 201);
};
