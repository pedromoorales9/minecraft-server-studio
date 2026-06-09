import got, { type Got } from 'got';

export const http: Got = got.extend({
  headers: {
    'User-Agent': 'MinecraftServerStudio/0.1 (+https://github.com)',
    Accept: 'application/json',
  },
  retry: { limit: 3 },
  timeout: { request: 30_000 },
  responseType: 'json',
});
