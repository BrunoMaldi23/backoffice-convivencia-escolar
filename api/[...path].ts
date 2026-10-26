import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApplication } from '../apps/api/src/bootstrap';

type HttpHandler = (request: IncomingMessage, response: ServerResponse) => void;

let handlerPromise: Promise<HttpHandler> | undefined;

async function getHandler(): Promise<HttpHandler> {
  const app = await createApplication();
  await app.init();
  return app.getHttpAdapter().getInstance() as HttpHandler;
}

export default async function handler(request: IncomingMessage, response: ServerResponse): Promise<void> {
  handlerPromise ??= getHandler();
  (await handlerPromise)(request, response);
}
