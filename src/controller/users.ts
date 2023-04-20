import { MiddlewareHandler } from 'hono';
import { z } from 'zod';

export const userSchema = z.object({
	username: z.string(),
	github_id: z.number()
});

export const upsertUser: MiddlewareHandler = async (c) => {
	const { username, github_id } = c.req.valid('json');
	const getExisting = c.env.WORDLETTUCE_DB.prepare(
		'select github_id, username from users where github_id = ?1'
	).bind(github_id);
	const existingUserResponse = await getExisting.all();
	let results;
	if (existingUserResponse?.results?.length) {
		const query = c.env.WORDLETTUCE_DB.prepare(
			'update users set username = ?1 where github_id = ?2'
		).bind(username, github_id);
		results = await query.run();
	} else {
		const query = c.env.WORDLETTUCE_DB.prepare(
			'insert into users (github_id, username) values (?1, ?2)'
		).bind(github_id, username);
		results = await query.run();
	}
	const { success } = results;
	if (!success) {
		return c.text('oh no', 500);
	}

	return c.text('created', 201);
};

export const userFilterSchema = z.object({
	count: z.coerce.number().positive().optional(),
	offset: z.coerce.number().positive().optional()
});

export const getUsers: MiddlewareHandler = async (c) => {
	const { count = 10, offset = 0 } = c.req.valid('query');
	const query = c.env.WORDLETTUCE_DB.prepare(
		'select * from users order by id limit ?1 offset ?2'
	).bind(count, offset);
	const queryData = await query.all();
	const { success, results, meta } = queryData;
	const { duration, changes } = meta;
	return c.json({ success, results, meta: { duration, changes } });
};

export const getUserRequestSchema = z.object({
	id: z.coerce.number({ invalid_type_error: 'id must be numeric.' }).int().positive()
});

export const getUser: MiddlewareHandler = async (c) => {
	const { id } = c.req.valid('param');
	const query = c.env.WORDLETTUCE_DB.prepare('select * from users where id = ?1').bind(id);
	const { success, results, meta } = await query.all();
	return c.json({
		success,
		results,
		meta
	});
};

export const getUserGameResults: MiddlewareHandler = async (c) => {
	const user = c.req.param('user');
	const count = c.req.query('count') || 90;
	const offset = c.req.query('offset') || 0;
	const query = c.env.WORDLETTUCE_DB.prepare(
		'SELECT gamenum, username, answers, attempts FROM game_results a inner join users b on a.user_id = b.github_id WHERE USERNAME = ?1 ORDER BY GAMENUM DESC LIMIT ?2 OFFSET ?3'
	).bind(user, count, offset);

	const countQuery = c.env.WORDLETTUCE_DB.prepare(
		'SELECT COUNT(*) rowCount from game_results a inner join users b on a.user_id = b.github_id where username = ?1'
	).bind(user);
	const [stuff, countStuff] = await Promise.all([query.all(), countQuery.all()]);
	const { success, results, meta } = stuff;
	if (!success) {
		return c.text('oh no', 500);
	}
	const { duration } = meta;
	return c.json({
		success,
		meta: {
			duration
		},
		results,
		totalCount: countStuff.results.at(0).rowCount
	});
};

export const getGameResult: MiddlewareHandler = async (c) => {
	const user = c.req.param('user');
	const gamenum = Number(c.req.param('gamenum'));
	const query = c.env.WORDLETTUCE_DB.prepare(
		'SELECT gamenum, username, answers, attempts FROM game_results a inner join users b on a.user_id = b.github_id WHERE USERNAME = ?1 AND GAMENUM = ?2 LIMIT 1'
	).bind(user, gamenum);
	const queryData = await query.all();
	const { success, results, meta } = queryData;
	const [gameResult] = results;
	return c.json({
		success,
		gameResult,
		meta: {
			duration: meta.duration
		}
	});
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
