import * as v from 'valibot';
export const PositiveIntegerSchema = v.pipe(v.number(), v.integer(), v.minValue(1));
export const UserIdSchema = PositiveIntegerSchema;
export const UsernameSchema = v.string();
export const GameNumSchema = PositiveIntegerSchema;
export const AnswerSchema = v.pipe(
	v.string(),
	v.regex(/[xci_]/),
	v.check((input) => input.length % 5 === 0, 'Must be multiple of 5 characters')
);
