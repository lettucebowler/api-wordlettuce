import { Hono } from 'hono';
import type { ApiWordLettuceBindings } from './util/env';
import userController from './controller/users';
import { rankingsControllerV2 } from './controller/rankings';
import gameResultsController from './controller/game-results';
import { cors } from 'hono/cors'

const app = new Hono<{ Bindings: ApiWordLettuceBindings }>();
app.use(cors({
	origin: '*',
	allowMethods: ['GET', 'POST', 'OPTIONS'],
	exposeHeaders: ['Content-Length'],
	maxAge: 600,
	credentials: true,

}))
app.route('/v1/users', userController);
app.route('/v2/rankings', rankingsControllerV2);
app.route('/v1/game-results', gameResultsController);

export default app;
