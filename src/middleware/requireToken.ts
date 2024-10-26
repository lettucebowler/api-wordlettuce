import { MiddlewareHandler } from 'hono';
import { bearerAuth } from 'hono/bearer-auth';

export const requireToken: MiddlewareHandler = async function (c, next) {
	const token = c.env.TOKEN;
	const auth = bearerAuth({ token });
	return auth(c, next);
};
