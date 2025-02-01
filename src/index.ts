import { Hono } from 'hono';
import type { ApiWordLettuceBindings } from './util/env';
import usersController from './controller/users';
import { rankingsControllerV2 } from './controller/rankings';
import gameResultsController from './controller/game-results';
import { requireToken } from './middleware/requireToken';

const app = new Hono<{ Bindings: ApiWordLettuceBindings }>();
app.use(requireToken);

app.route('/v2/rankings', rankingsControllerV2);
app.route('/v1/game-results', gameResultsController);
app.route('/v1/users', usersController);

export default app;
