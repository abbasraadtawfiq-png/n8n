import { makeRouteHandler } from '@keystatic/next/route-handler';
import config from '../../../../../keystatic.config';
import { isCmsEnabled } from '@/lib/cms';

// Created lazily: Keystatic validates GitHub credentials when the handler is made.
let handler: ReturnType<typeof makeRouteHandler> | null = null;
const getHandler = () => (handler ??= makeRouteHandler({ config }));
const disabled = () => new Response('Not found', { status: 404 });

export const GET = (req: Request) => (isCmsEnabled() ? getHandler().GET(req) : disabled());
export const POST = (req: Request) => (isCmsEnabled() ? getHandler().POST(req) : disabled());
