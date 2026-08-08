import { API_PREFIX, AUTH_PREFIX } from '@/lib/constants';
import env, { frontendOrigins } from '@/config/env';
import LogContextMiddleware from '@/middlewares/log';
import { attachSession } from '@/middlewares/auth';
import { errorHandler } from '@/middlewares/error';
import { systemLogger } from '@/lib/utils/logger';
import { toNodeHandler } from 'better-auth/node';
import { createNamespace } from 'cls-hooked';
import cookieParser from 'cookie-parser';
import { auth } from '@/lib/auth';
import express from 'express';
import cors from 'cors';
import TestRouter from './routes';

const app = express();

createNamespace('request');

app.use(cookieParser());

app.use(
  cors({
    origin: (origin: any, callback: any) => {
      if (!origin) return callback(null, true);
			console.log('CORS origin:', origin);
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

app.use(`${API_PREFIX}/test`, TestRouter);

app.use(errorHandler);

app.listen(env.PORT, async () => {
  systemLogger.info(`Server is running on http://localhost:${env.PORT}`);
});
