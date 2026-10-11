function firstHeaderValue(value) {
  return value?.split(',', 1)[0]?.trim() || '';
}

function normalizedHttpOrigin(value) {
  try {
    const parsed = new URL(value);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.origin : null;
  } catch {
    return null;
  }
}

export function isSameOriginRequest(request) {
  const requestUrl = new URL(request.url);
  const suppliedOrigin = normalizedHttpOrigin(request.headers.get('origin'));
  if (!suppliedOrigin) return false;

  const allowedOrigins = new Set([requestUrl.origin]);
  const forwardedProtocol = firstHeaderValue(request.headers.get('x-forwarded-proto'));
  const effectiveProtocol = ['http', 'https'].includes(forwardedProtocol)
    ? forwardedProtocol
    : requestUrl.protocol.slice(0, -1);

  for (const header of ['host', 'x-forwarded-host']) {
    const host = firstHeaderValue(request.headers.get(header));
    if (!host) continue;
    const origin = normalizedHttpOrigin(`${effectiveProtocol}://${host}`);
    if (origin) allowedOrigins.add(origin);
  }

  return allowedOrigins.has(suppliedOrigin);
}
