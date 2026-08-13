import { API_PREFIX, AUTH_PREFIX } from '@/lib/constants';
import env, { frontendOrigins } from '@/config/env';
import LogContextMiddleware from '@/middlewares/log';
import { attachSession } from '@/middlewares/auth';
import { errorHandler } from '@/middlewares/error';
import { systemLogger } from '@/lib/utils/logger';
import { toNodeHandler } from 'better-auth/node';
import { createNamespace } from 'cls-hooked';
import { initRealtime } from '@/lib/realtime';
import cookieParser from 'cookie-parser';
import ApiRouter from '@/routes';
import { auth } from '@/lib/auth';
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';

const app = express();

createNamespace('request');

app.use(cookieParser());

app.use(
  cors({
    origin: (origin: any, callback: any) => {
      if (!origin) return callback(null, true);
      if (frontendOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  })
);

app.use(LogContextMiddleware);

app.all(`${AUTH_PREFIX}/*splat`, toNodeHandler(auth));

app.use(
  express.json({
    limit: '10mb',
  })
);

app.use(attachSession);

app.use(API_PREFIX, ApiRouter);

app.use(errorHandler);

const server = createServer(app);

initRealtime(server);

server.listen(env.PORT, async () => {
  systemLogger.info(`Server is running on http://localhost:${env.PORT}`);
});
