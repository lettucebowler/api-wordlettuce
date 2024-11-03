import { drizzle } from 'drizzle-orm/d1';
import { Context } from 'hono';
import { ApiWordLettuceBindings } from '../util/env';
import { encodeBase32, encodeHexLowerCase } from '@oslojs/encoding';
import { sha256 } from '@oslojs/crypto/sha2';
import { userTable, sessionTable } from '../schema/drizzle';
import { eq } from 'drizzle-orm';
import type { User } from './user';

export function createSessionDao(c: Context<{ Bindings: ApiWordLettuceBindings }>) {
	const db = drizzle(c.env.WORDLETTUCE_DB);

	async function validateSessionToken({
		token
	}: {
		token: string;
	}): Promise<SessionValidationResult> {
		const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
		const [row] = await db
			.select({
				sessionId: sessionTable.id,
				expiresAt: sessionTable.expiresAt,
				userId: userTable.id,
				githubId: userTable.githubId,
				email: userTable.email,
				username: userTable.username
			})
			.from(userTable)
			.innerJoin(sessionTable, eq(sessionTable.userId, userTable.id))
			.where(eq(sessionTable.id, sessionId));

		if (!row) {
			return { session: null, user: null };
		}
		const session: Session = {
			id: row.sessionId,
			userId: row.userId,
			expiresAt: new Date(row.expiresAt * 1000)
		};
		const user: User = {
			id: row.userId,
			githubId: row.githubId,
			email: row.email,
			username: row.username
		};
		if (Date.now() >= session.expiresAt.getTime()) {
			db.delete(sessionTable).where(eq(sessionTable.id, sessionId));
			return { session: null, user: null };
		}
		if (Date.now() >= session.expiresAt.getTime() - 1000 * 60 * 60 * 24 * 15) {
			session.expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
			db.update(sessionTable)
				.set({ expiresAt: Math.floor(session.expiresAt.getTime() / 1000) })
				.where(eq(sessionTable.id, session.id));
		}
		return { session, user };
	}

	async function invalidateSession(sessionId: string) {
		await db.delete(sessionTable).where(eq(sessionTable.id, sessionId));
	}

	async function invalidateUserSessions(userId: number): Promise<void> {
		await db.delete(sessionTable).where(eq(sessionTable.userId, userId));
	}

	async function createSession({ userId }: { userId: number }): Promise<Session> {
		const tokenBytes = new Uint8Array(20);
		crypto.getRandomValues(tokenBytes);
		const token = encodeBase32(tokenBytes).toLowerCase();
		const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
		const session: Session = {
			id: sessionId,
			userId,
			expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
		};
		await db.insert(sessionTable).values({
			id: session.id,
			userId: session.userId,
			expiresAt: Math.floor(session.expiresAt.getTime() / 1000)
		});
		return session;
	}

	return {
		validateSessionToken,
		createSession,
		invalidateSession,
		invalidateUserSessions
	};
}

export interface Session {
	id: string;
	expiresAt: Date;
	userId: number;
}

type SessionValidationResult = { session: Session; user: User } | { session: null; user: null };
