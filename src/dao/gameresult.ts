import { drizzle } from 'drizzle-orm/d1';
import { gameResultTable, sessionTable, userTable } from '../schema/drizzle';
import { and, count, desc, eq, gt, lte, sql } from 'drizzle-orm';
import { getGameNum } from '../util/game-num';
import { Context } from 'hono';
import { ApiWordLettuceBindings } from '../util/env';

export function createGameResultDao(c: Context<{ Bindings: ApiWordLettuceBindings }>) {
	const db = drizzle(c.env.WORDLETTUCE_DB);

	async function saveGame({
		userId,
		gameNum,
		answers
	}: {
		userId: number;
		gameNum: number;
		answers: string;
	}) {
		const attempts = Math.floor(answers.length / 5);
		return db
			.insert(gameResultTable)
			.values({
				gameNum,
				userId,
				answers,
				attempts
			})
			.onConflictDoUpdate({
				target: [gameResultTable.userId, gameResultTable.gameNum],
				set: { answers, attempts }
			})
			.returning();
	}

	async function getRankings() {
		const gameNum = getGameNum();
		const query = db
			.select({
				user: userTable.username,
				games: count(gameResultTable.attempts),
				score:
					sql`count(${gameResultTable.attempts}) + sum(max(0, 6 - ${gameResultTable.attempts}))`
						.mapWith(Number)
						.as('score')
			})
			.from(userTable)
			.innerJoin(gameResultTable, eq(userTable.id, gameResultTable.userId))
			.where(and(gt(gameResultTable.gameNum, gameNum - 7), lte(gameResultTable.gameNum, gameNum)))
			.groupBy(userTable.id)
			.orderBy(desc(sql`score`))
			.limit(10);
		return query.all();
	}

	async function getNextPageAfter({
		username,
		limit = 30,
		start = getGameNum()
	}: {
		username: string;
		limit: number;
		start: number;
	}) {
		const query = db
			.select({
				gameNum: gameResultTable.gameNum,
				answers: gameResultTable.answers,
				userId: gameResultTable.userId,
				attempts: gameResultTable.attempts
			})
			.from(userTable)
			.innerJoin(gameResultTable, eq(userTable.githubId, gameResultTable.userId))
			.where(and(eq(userTable.username, username), lte(gameResultTable.gameNum, start)))
			.orderBy(desc(gameResultTable.gameNum))
			.limit(limit + 1);
		const results = await query.all();
		return {
			results: results.slice(0, limit),
			next: results.length > limit ? results.at(-1)?.gameNum : null,
			limit
		};
	}

	return {
		saveGame,
		getRankings,
		getNextPageAfter
	};
}
