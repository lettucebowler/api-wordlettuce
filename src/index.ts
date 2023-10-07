import { Hono } from 'hono';
import { zValidator } from './middleware/validator';
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

import { getRankingsRequestSchema, getRankings } from './controller/rankings';
app.get('/v1/rankings', zValidator('query', getRankingsRequestSchema), getRankings);

import { userSchema, upsertUser } from './controller/users';
app.post('/v1/users', zValidator('json', userSchema), upsertUser);

import { getUserGameResults } from './controller/users';
app.get('/v1/users/:user/gameresults', getUserGameResults);

import { saveGameResultRequestSchema, saveGameResults } from './controller/users';
app.put(
	'/v1/users/:user/gameresults/:gamenum',
	zValidator('json', saveGameResultRequestSchema),
	saveGameResults
);

export default app;
