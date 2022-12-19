export interface Env {
	AUTH: KVNamespace;
	DB: D1Database;
}

import { Hono } from 'hono';
const app = new Hono();

import { bearerAuth } from './middleware/bearerAuth';
import {
	validateStashProfileRequest,
	stashProfile,
	validateGetProfileRequest,
	getProfile,
	getCachedProfile
} from './controller/auth';
import {
	getGameResults,
	validateGetInfoForLeaderboardRequest,
	getInfoForLeaderboard,
	validateSaveGameResultsRequest,
	saveGameResults
} from './controller/gameresults';

app.use('/api/*', bearerAuth);

app.post('/api/auth/set', validateStashProfileRequest, stashProfile);

app.get(
	'/api/auth/get',
	validateGetProfileRequest,
	getCachedProfile, // cloudflare cache api
	getProfile // last resort go out the the KV store
);

app.get(
	'/api/gameresults/leaderboard',
	validateGetInfoForLeaderboardRequest,
	getInfoForLeaderboard
);

app.get('/api/gameresults/:user', getGameResults);

app.post('/api/gameresults', validateSaveGameResultsRequest, saveGameResults);

export default app;
