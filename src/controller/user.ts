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

export const getUserGameResults: MiddlewareHandler = async (c) => {
	const user = c.req.param('user');
	const count = c.req.query('count') || 90;
	const offset = c.req.query('offset') || 0;
	const query = c.env.WORDLETTUCE_DB.prepare(
		'SELECT gamenum, username, answers, attempts FROM game_results a inner join users b on a.user_id = b.github_id WHERE USERNAME = ?1 ORDER BY GAMENUM DESC LIMIT ?2 OFFSET ?3'
	).bind(user, count, offset);
	const stuff = await query.all();
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
		results
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
