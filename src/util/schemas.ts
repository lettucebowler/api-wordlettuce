import { custom, integer, minValue, number, regex, string } from 'valibot';
import * as v from 'valibot';
export const positiveInteger = v.pipe(v.number(), v.integer(), v.minValue(1));
export const userIdSchema = positiveInteger;
export const usernameSchema = v.string();
export const gameNumSchema = positiveInteger;
export const answerSchema = v.pipe(
	v.string(),
	v.regex(/[xci_]/),
	v.custom((input) => input.length % 5 === 0, 'Must be multiple of 5 characters')
);
