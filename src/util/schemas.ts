import { custom, integer, minValue, number, regex, string } from 'valibot';
export const positiveInteger = number([integer(), minValue(1)]);
export const userIdSchema = positiveInteger;
export const usernameSchema = string();
export const gameNumSchema = positiveInteger;
export const answerSchema = string([
	regex(/[xci_]/),
	custom((input) => input.length % 5 === 0, 'Must be multiple of 5 characters')
]);
