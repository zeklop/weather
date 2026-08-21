import type { Env } from './types';
import { handleSubscribe, handleUnsubscribe } from './routes/subscribe';
import { handlePing, handleStatsSummary } from './routes/stats';
import { handleScheduled } from './routes/cron';

function corsHeaders(request: Request, env: Env): Headers {
	const headers = new Headers();
	const requestOrigin = request.headers.get('Origin');
	// APP_ORIGIN pins allowed origins (comma-separated). When unset (local dev),
	// the request origin is reflected.
	const allowedOrigins = (env.APP_ORIGIN || '')
		.split(',')
		.map((o) => o.trim().replace(/\/$/, ''))
		.filter(Boolean);
	if (requestOrigin && (allowedOrigins.length === 0 || allowedOrigins.includes(requestOrigin.replace(/\/$/, '')))) {
		headers.set('Access-Control-Allow-Origin', requestOrigin);
		headers.set('Vary', 'Origin');
	}
	headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
	headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
	headers.set('Access-Control-Max-Age', '86400');
	return headers;
}

export default {
	async fetch(request: Request, env: Env, _ctx: unknown): Promise<Response> {
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				status: 204,
				headers: corsHeaders(request, env)
			});
		}

		const url = new URL(request.url);
		const path = url.pathname;
		let response: Response;

		if (request.method === 'POST' && path === '/api/push/subscribe') {
			response = await handleSubscribe(request, env);
		} else if (request.method === 'POST' && path === '/api/push/unsubscribe') {
			response = await handleUnsubscribe(request, env);
		} else if (request.method === 'POST' && path === '/api/stats/ping') {
			response = await handlePing(request, env);
		} else if (request.method === 'GET' && path === '/api/stats/summary') {
			response = await handleStatsSummary(request, env);
		} else if (request.method === 'GET' && path === '/health') {
			response = new Response(JSON.stringify({ status: 'ok', time: Date.now() }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			});
		} else {
			response = new Response(JSON.stringify({ error: 'Not Found' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Attach CORS headers
		const resHeaders = new Headers(response.headers);
		const cors = corsHeaders(request, env);
		for (const [k, v] of cors.entries()) {
			resHeaders.set(k, v);
		}

		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers: resHeaders
		});
	},

	async scheduled(_event: unknown, env: Env, _ctx: unknown): Promise<void> {
		await handleScheduled(env);
	}
};
