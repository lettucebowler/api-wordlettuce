import { Hono } from 'hono';
import { bearerAuth } from 'hono/bearer-auth';
import type { ApiWordLettuceBindings } from './util/env';
import userController from './controller/users';
import { rankingsControllerV2 } from './controller/rankings';
import gameResultsController from './controller/game-results';
import identitiesController from './controller/identities';

const app = new Hono<{ Bindings: ApiWordLettuceBindings }>();

app.use(async (c, next) => {
	const token = c.env.TOKEN;
	const auth = bearerAuth({ token });
	return auth(c, next);
});
app.route('/v1/users', userController);
app.route('/v2/rankings', rankingsControllerV2);
app.route('/v1/game-results', gameResultsController);
app.route('/v1/identity-providers', identitiesController);

export default app;
