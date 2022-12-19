import type { MiddlewareHandler } from 'hono';
import { validator } from 'hono/validator';

export const validateStashProfileRequest = validator((v) => ({
	session: v.json('session').isRequired().match(/^gho_/),
	profile: {
		login: v.json('profile.login').isRequired(),
		avatar: v.json('profile.avatar').isRequired()
	}
}));

export const stashProfile: MiddlewareHandler = async (c) => {
	const body = c.req.valid();
	const { session, profile } = body;
	const cache = caches.default;
	await cache.delete('https://api.word.lettucebowler.net/api/auth/' + session);
	let profileString = '';
	try {
		profileString = JSON.stringify(profile);
	} catch (e) {
		return new Response('Bad request: profile must be serializable to JSON.', {
			status: 400
		});
	}

	c.env.AUTH.put(session, profileString, { expirationTtl: 900 });
	return new Response('Created', {
		status: 201
	});
};

export const validateGetProfileRequest = validator((v) => ({
	session: v.header('session').isRequired().match(/^gho_/)
}));

export const getCachedProfile: MiddlewareHandler = async (c, next) => {
	const cache = caches.default;
	const key = 'https://api.word.lettucebowler.net/api/auth/' + c.req.valid().session;
	const response = await cache.match(key);
	if (!response) {
		await next();
		c.executionCtx.waitUntil(cache.put(key, c.res.clone()));
	}
	return response;
};

export const getProfile: MiddlewareHandler = async (c) => {
	const body = c.req.valid();
	const session = `${body.session}`;
	const profile = await c.env.AUTH.get(session, { type: 'json', cacheTtl: 900 });
	c.header('Cache-Control', 'max-age:850;');
	return c.json(profile);
};
