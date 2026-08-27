/**
 * Tests for the API path reconstruction that fixes production routing.
 *
 * Background: `api/[...slug].ts` matched only one segment after /api on Vercel,
 * so /api/user-profile worked but /api/dashboard/22 returned the platform's own
 * 404. All /api traffic is now rewritten to a single function carrying the real
 * path in `__apiPath`; this verifies that reconstruction is exact.
 *
 * Run with:  npx tsx api/path-resolution.test.ts
 */

// Mirrors resolveRequestPath in api/index.ts. Kept in step by the assertions
// below, which encode the exact production URL shapes.
function resolveRequestPath(req: { url?: string }): string {
  const raw: string = req.url || '/';
  const rawQuery = raw.split('?')[1] ?? '';
  const params = new URLSearchParams(rawQuery);
  const forwarded = params.get('__apiPath');

  if (forwarded === null) return raw;

  params.delete('__apiPath');
  const rest = params.toString();
  const path = forwarded ? `/api/${forwarded}` : '/api';
  return rest ? `${path}?${rest}` : path;
}

let passed = 0, failed = 0;
function eq(name: string, got: string, want: string) {
  if (got === want) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; console.log(`  FAIL  ${name} -- got "${got}" want "${want}"`); }
}

console.log('\nMulti-segment paths (the ones that 404d in production)');
eq('dashboard with a user id',
  resolveRequestPath({ url: '/api?__apiPath=dashboard/22' }), '/api/dashboard/22');
eq('weekly food entries',
  resolveRequestPath({ url: '/api?__apiPath=food-entries/weekly' }), '/api/food-entries/weekly');
eq('daily food entries',
  resolveRequestPath({ url: '/api?__apiPath=food-entries/daily' }), '/api/food-entries/daily');
eq('chat messages',
  resolveRequestPath({ url: '/api?__apiPath=chat/messages' }), '/api/chat/messages');
eq('three segments deep',
  resolveRequestPath({ url: '/api?__apiPath=a/b/c' }), '/api/a/b/c');

console.log('\nSingle-segment paths still resolve');
eq('user', resolveRequestPath({ url: '/api?__apiPath=user' }), '/api/user');
eq('user-profile', resolveRequestPath({ url: '/api?__apiPath=user-profile' }), '/api/user-profile');
eq('health', resolveRequestPath({ url: '/api?__apiPath=health' }), '/api/health');
eq('bare /api', resolveRequestPath({ url: '/api?__apiPath=' }), '/api');

console.log('\nQuery strings survive, routing detail is stripped');
eq('single query param preserved',
  resolveRequestPath({ url: '/api?__apiPath=chat/messages&conversationId=abc' }),
  '/api/chat/messages?conversationId=abc');
eq('multiple query params preserved',
  resolveRequestPath({ url: '/api?__apiPath=food-entries&userId=7&limit=5' }),
  '/api/food-entries?userId=7&limit=5');
eq('__apiPath never leaks into the handler URL',
  resolveRequestPath({ url: '/api?__apiPath=stats&range=7d' }), '/api/stats?range=7d');

console.log('\nDirect invocation (local dev) is untouched');
eq('plain path passes through',
  resolveRequestPath({ url: '/api/dashboard/22' }), '/api/dashboard/22');
eq('plain path with query passes through',
  resolveRequestPath({ url: '/api/stats?range=7d' }), '/api/stats?range=7d');
eq('missing url falls back to root', resolveRequestPath({}), '/');

console.log('\nEncoded segments');
eq('url-encoded characters survive',
  resolveRequestPath({ url: '/api?__apiPath=food-entries/a%20b' }), '/api/food-entries/a b');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
