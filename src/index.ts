import { Hono } from 'hono';
import type { ApiWordLettuceBindings } from './util/env';
import usersController from './controller/users';
import { rankingsControllerV2 } from './controller/rankings';
import gameResultsController from './controller/game-results';
import { cors } from 'hono/cors';
import { requireToken } from './middleware/requireToken';

const app = new Hono<{ Bindings: ApiWordLettuceBindings }>();
app.use(
	cors({
		origin: '*',
		allowMethods: ['GET', 'POST', 'OPTIONS'],
		exposeHeaders: ['Content-Length'],
		maxAge: 600,
		credentials: true
	})
);
app.use(requireToken);
app.route('/v1/users', usersController);
app.route('/v2/rankings', rankingsControllerV2);
app.route('/v1/game-results', gameResultsController);

export default app;
