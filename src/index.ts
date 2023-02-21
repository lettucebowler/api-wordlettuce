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
app.get(
	'/api/gameresults/leaderboard',
	zValidator('query', leaderboardRequestSchema),
	getInfoForLeaderboard
);

import { saveGameResultRequestSchema, saveGameResults } from './controller/gameresults';
app.post('/api/gameresults', zValidator('json', saveGameResultRequestSchema), saveGameResults);

import { getGameResults } from './controller/gameresults';
app.get('/api/gameresults/:user', getGameResults);

import { userSchema, upsertUser } from './controller/user';
app.post('/api/user', zValidator('json', userSchema), upsertUser);

export default app;
