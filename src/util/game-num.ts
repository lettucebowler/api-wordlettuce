export function getGameNum() {
	const msInADay = 1000 * 60 * 60 * 24;
	const initial = new Date(1643673600000);
	const now = new Date();
	return Math.floor((now.getTime() - initial.getTime()) / msInADay);
}
