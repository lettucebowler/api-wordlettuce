import { Hono } from 'hono';
import type { ApiWordLettuceBindings } from './util/env';
import usersController from './controller/users';
import { rankingsControllerV2 } from './controller/rankings';
import gameResultsController from './controller/game-results';
import gameResultsControllerV2 from './controller/game-results-v2';
import { requireToken } from './middleware/requireToken';
import { rankingsControllerV3 } from './controller/rankings-v3';
import { sessionsController } from './controller/sessions';

const app = new Hono<{ Bindings: ApiWordLettuceBindings }>();
app.use(requireToken);

app.route('/v2/rankings', rankingsControllerV2);
app.route('/v1/game-results', gameResultsController);

app.route('/v2/game-results', gameResultsControllerV2);
app.route('/v3/rankings', rankingsControllerV3);
app.route('/v1/sessions', sessionsController);
app.route('/v1/users', usersController);

export default app;
