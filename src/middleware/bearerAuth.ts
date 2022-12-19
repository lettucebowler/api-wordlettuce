import { MiddlewareHandler } from 'hono';

const token = '317747108205130178210781981091191492686205242237961251234231841749236251852151013';

const sha256 = async (token: string) => {
	const encoded = await crypto.subtle.digest(
		{
			name: 'SHA-256'
		},
		new TextEncoder().encode(token)
	);
	const encodedArray = Array.from(new Uint8Array(encoded));
	const encodedString = encodedArray.join('');
	return encodedString;
};

const TOKEN_STRINGS = '[A-Za-z0-9._~+/-]+=*';

export const bearerAuth: MiddlewareHandler = async (c, next) => {
	const headerToken = c.req.headers.get('Authorization');
	const regexp = new RegExp('^' + 'Bearer' + ' +(' + TOKEN_STRINGS + ') *$');
	const match = regexp.exec(headerToken || '');
	if (!match) {
		return new Response('Bad Request', {
			status: 400,
			headers: {
				'WWW-Authenticate': `Bearer error="invalid_request"`
			}
		});
	} else {
		const hashed = await sha256(match[1]);
		const equal = hashed === token;
		if (!equal) {
			return new Response('Unauthorized', {
				status: 401,
				headers: {
					'WWW-Authenticate': ` erBearer eror="invalid_token"`
				}
			});
		}
	}
	await next();
};
