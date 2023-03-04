import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { bearerAuth } from 'hono/bearer-auth';

type Bindings = {
	WORDLETTUCE_DB: D1Database;
	TOKEN: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('/*', async (c, next) => {
	const token = c.env.TOKEN;
	const auth = bearerAuth({ token });
	return auth(c, next);
});

import { getInfoForLeaderboard, leaderboardRequestSchema } from './controller/gameresults';
app.get('/leaderboard', zValidator('query', leaderboardRequestSchema), getInfoForLeaderboard);

app.get('/gameresults');

import { userSchema, upsertUser } from './controller/user';
app.post('/users', zValidator('json', userSchema), upsertUser);

import { userFilterSchema, getUsers } from './controller/user';
app.get('/users', zValidator('query', userFilterSchema), getUsers);

import { getUserGameResults } from './controller/user';
app.get('/users/:user/gameresults', getUserGameResults);

import { getGameResult } from './controller/user';
app.get('/users/:user/gameresults/:gamenum', getGameResult);

import { saveGameResultRequestSchema, saveGameResults } from './controller/gameresults';
app.put(
	'/users/:user/gameresults/:gamenum',
	zValidator('json', saveGameResultRequestSchema),
	saveGameResults
);

export default app;
