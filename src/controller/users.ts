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
	let createdAccounts;
	if (existingUserResponse?.results?.length) {
		const query = c.env.WORDLETTUCE_DB.prepare(
			'update users set username = ?1 where github_id = ?2'
		).bind(username, github_id);
		createdAccounts = await query.run();
	} else {
		const query = c.env.WORDLETTUCE_DB.prepare(
			'insert into users (github_id, username) values (?1, ?2)'
		).bind(github_id, username);
		createdAccounts = await query.run();
	}
	const { success } = createdAccounts;
	if (!success) {
		return c.json({
			success: false,
			message: 'Create failed.',
		}, 500)
	}
	const getCreated = c.env.WORDLETTUCE_DB.prepare(
		`select github_id, username, id from users where github_id = ?1 and username = ?2`
	).bind(github_id, `${username}`);
	createdAccounts = await getCreated.all();
	if (!createdAccounts.success) {
		return c.json({
			success: false,
			message: 'Create failed.',
		}, 500);
	}
	const [ created ] = createdAccounts.results;
	return c.json({
		success: true,
		data: {
			created,
		}
	});
};

export const getUserGameResults: MiddlewareHandler = async (c) => {
	const user = c.req.param('user');
	const count = c.req.query('count') || 90;
	const offset = c.req.query('offset') || 0;
	const query = c.env.WORDLETTUCE_DB.prepare(
		'SELECT gamenum, answers, attempts FROM game_results a inner join users b on a.user_id = b.github_id WHERE USERNAME = ?1 ORDER BY GAMENUM DESC LIMIT ?2 OFFSET ?3'
	).bind(user, count, offset);

	const countQuery = c.env.WORDLETTUCE_DB.prepare(
		'SELECT COUNT(*) rowCount from game_results a inner join users b on a.user_id = b.github_id where username = ?1'
	).bind(user);
	const [stuff, countStuff] = await Promise.all([query.all(), countQuery.all()]);
	const { success, results } = stuff;
	if (!success) {
		return c.json({
			success: false,
			message: 'Query failed.'
		});
	}
	return c.json({
		success,
		data: {
			results,
			totalCount: countStuff.results.at(0).rowCount
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

	if (!results.success) {
		return c.json({
			success: false,
			message: 'Create failed.',
		}, 500);
	}
	return c.json({
		success: true,
		data: {
			created: {
				gamenum,
				answers,
				attempts,
			}
		}
	})
};
