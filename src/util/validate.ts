import { Context } from 'hono';
import { ObjectSchema, StringSchema, safeParse } from 'valibot';
import { HTTPException } from 'hono/http-exception';

type JsonRequestSchema = ObjectSchema<{
	query?: ObjectSchema<any>;
	param?: ObjectSchema<any>;
	json?: ObjectSchema<any>;
	header?: ObjectSchema<any>;
}>;
type TextRequestSchema = ObjectSchema<{
	query?: ObjectSchema<any>;
	param?: ObjectSchema<any>;
	text?: StringSchema;
	header?: ObjectSchema<any>;
}>;
type RequestSchema = JsonRequestSchema | TextRequestSchema;
export async function validateRequest<T extends RequestSchema>(schema: T, c: Context) {
	const query = c.req.query();
	const param = c.req.param();
	const header = c.req.header();
	const json =
		header['content-length'] &&
		Number(header['content-length']) &&
		header['content-type'] &&
		header['content-type'].includes('json')
			? await c.req.json()
			: undefined;
	const text =
		header['content-length'] &&
		Number(header['content-length']) &&
		header['content-type'] &&
		header['content-type'].includes('text')
			? await c.req.text()
			: undefined;
	const parseResult = safeParse(schema, {
		query,
		param,
		json,
		text,
		header
	});
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
	} else {
		return parseResult.output;
	}
}
