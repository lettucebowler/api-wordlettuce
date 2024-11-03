import { Context } from 'hono';
import { userTable } from '../schema/drizzle';
import { eq } from 'drizzle-orm';
import { ApiWordLettuceBindings } from '../util/env';
import { drizzle } from 'drizzle-orm/d1';

export function createUserDao(c: Context<{ Bindings: ApiWordLettuceBindings }>) {
	const db = drizzle(c.env.WORDLETTUCE_DB);

	async function createUser({
		githubId,
		email,
		username
	}: {
		githubId: number;
		email: string;
		username: string;
	}): Promise<User> {
		const [row] = await db
			.insert(userTable)
			.values({
				githubId,
				email,
				username
			})
			.returning({ userId: userTable.id });
		if (!row) {
			throw new Error('Unexpected error');
		}
		const user: User = {
			id: row.userId,
			githubId,
			email,
			username
		};
		return user;
	}

	async function getUserFromGitHubId({ githubId }: { githubId: number }): Promise<User | null> {
		const [row] = await db
			.select({
				id: userTable.id,
				githubId: userTable.githubId,
				email: userTable.email,
				username: userTable.username
			})
			.from(userTable)
			.where(eq(userTable.githubId, githubId));
		if (!row) {
			return null;
		}
		return row satisfies User;
	}

	async function upsertUser({
		username,
		githubId,
		email
	}: {
		username: string;
		email: string;
		githubId: number;
	}) {
		const [row] = await db
			.insert(userTable)
			.values({ username, githubId, email })
			.onConflictDoUpdate({ target: userTable.githubId, set: { username, email } })
			.returning();
		return row;
	}

	return {
		createUser,
		getUserFromGitHubId,
		upsertUser
	};
}

export interface User {
	id: number;
	email: string;
	githubId: number;
	username: string;
}
