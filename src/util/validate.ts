import { Context } from 'hono';
import { BaseSchema, safeParse } from 'valibot';
import { HTTPException } from 'hono/http-exception';

export function validate(c: Context, schema: BaseSchema, input: unknown) {
	const parseResult = safeParse(schema, input);
	if (!parseResult.success) {
		const message = parseResult.issues
			.map((issue) => {
				if (issue.path) {
					return `${issue.message} at '${issue.path.map((segment) => segment.key).join('.')}'`;
				}
				return issue.message;
			})
			.join('; ');
		const response = new Response(
			JSON.stringify({
				success: false,
				message
			}),
			{
				status: 400,
				headers: {
					'content-type': 'application/json'
				}
			}
		);
		throw new HTTPException(400, { res: response });
	}
	return parseResult.output;
}
