export interface Env {
	AUTH: KVNamespace;
	DB: D1Database;
	WORDLETTUCE_DB: D1Database;
}

import { Hono } from 'hono';
const app = new Hono();

import { bearerAuth } from './middleware/bearerAuth';
import {
	getGameResults,
	validateGetInfoForLeaderboardRequest,
	getInfoForLeaderboard,
	validateSaveGameResultsRequest,
	saveGameResults
} from './controller/gameresults';
import { upsertUser, validateUpsertUser } from './controller/user';

app.use('/api/*', bearerAuth);

app.get(
	'/api/gameresults/leaderboard',
	validateGetInfoForLeaderboardRequest,
	getInfoForLeaderboard
);

app.get('/api/gameresults/:user', getGameResults);

app.post('/api/gameresults', validateSaveGameResultsRequest, saveGameResults);

app.post('/api/user', validateUpsertUser, upsertUser);

export default app;
