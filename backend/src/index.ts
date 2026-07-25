import LogContextMiddleware from '@/middlewares/log';
import { errorHandler } from '@/middlewares/error';
import { systemLogger } from '@/lib/utils/logger';
import { API_PREFIX } from '@/lib/constants';
import { createNamespace } from 'cls-hooked';
import cookieParser from 'cookie-parser';
import express from 'express';
import cors from 'cors';
import env from '@/config/env';
import TestRouter from './routes';


const app = express();

createNamespace('request');

app.use(cookieParser());

const frontendOrigins = (env.FRONTEND_URL || '')
  .split(',')
  .map((u) => u.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin: any, callback: any) => {
      if (!origin) return callback(null, true);
      if (frontendOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  })
);

app.use(
  express.json({
    limit: '10mb',
  })
);

app.use(LogContextMiddleware);

app.use(`${API_PREFIX}/test`, TestRouter);

app.use(errorHandler);

app.listen(env.PORT, async () => {
  systemLogger.info(`Server is running on http://localhost:${env.PORT}`);
});
