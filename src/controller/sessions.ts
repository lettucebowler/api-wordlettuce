import { Hono } from 'hono';
import { ApiWordLettuceBindings } from '../util/env';
import * as v from 'valibot';
import { vValidator } from '@hono/valibot-validator';
import { createSessionDao } from '../dao/session';

const sessionsController = new Hono<{ Bindings: ApiWordLettuceBindings }>();

const ValidateSessionJson = v.object({
	token: v.string()
});

sessionsController.post('/validate', vValidator('json', ValidateSessionJson), async (c) => {
	const { token } = c.req.valid('json');
	const { validateSessionToken } = createSessionDao(c);
	try {
		const { session, user } = await validateSessionToken({ token });
		if (!session || !user) {
			return c.json(
				{
					message: 'Session not found'
				},
				404
			);
		}
		return c.json({
			session,
			user
		});
	} catch (e) {
		return c.json({
			message: 'Error getting session information'
		});
	}
});

const CreateSessionJson = v.object({ userId: v.pipe(v.number(), v.integer()) });

sessionsController.post('/', vValidator('json', CreateSessionJson), async (c) => {
	const { userId } = c.req.valid('json');
	const { createSession } = createSessionDao(c);
	try {
		const session = await createSession({ userId });
		return c.json(session, 201);
	} catch (e) {
		return c.json(
			{
				message: 'Error while creating session'
			},
			500
		);
	}
});

const InvalidateUserSessionJson = v.object({
	sessionId: v.string()
});

sessionsController.delete('/', vValidator('json', InvalidateUserSessionJson), async (c) => {
	const { sessionId } = c.req.valid('json');
	const { invalidateSession } = createSessionDao(c);
	try {
		await invalidateSession(sessionId);
		return c.json({ message: 'session deleted' }, 200);
	} catch (e) {
		return c.json(
			{
				message: 'Error invalidating session'
			},
			500
		);
	}
});
