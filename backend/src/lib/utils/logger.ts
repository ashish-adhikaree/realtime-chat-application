import { getNamespace } from 'cls-hooked';
import env from '../../config/env';
import winston from 'winston';
import os from 'os';

const errorFileTransport = new winston.transports.File({
  dirname: 'logs',
  filename: 'error.log',
  level: 'error',
});

const combinedFileTransport = new winston.transports.File({
  dirname: 'logs',
  filename: 'combined.log',
});

export const baseLogger = winston.createLogger({
  level: 'http',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [errorFileTransport, combinedFileTransport],
});

if (env.NODE_ENV !== 'production') {
  baseLogger.add(new winston.transports.Console({}));
  // baseLogger.remove(errorFileTransport);
  // baseLogger.remove(combinedFileTransport);
}

const logger = (
  { service, method, meta }: { service?: string; method?: string; meta?: Record<string, any> } = {
    service: 'default',
    method: 'default',
  }
) => {
  const ns = getNamespace('request');
  const context = ns ? ns.active : {};
  return baseLogger.child(
    context
      ? {
          requestId: context.requestId,
          machineName: context.machineName,
          req: {
            clientIp: context.clientIp,
            userAgent: context.userAgent,
            route: context.route,
            method: context.method,
          },
          location: {
            service,
            method,
          },
          meta,
        }
      : {
          location: {
            service,
            method,
          },
          meta,
        }
  );
};

export const systemLogger = baseLogger.child({
  machine: os.hostname,
  isSystemLog: true,
});

export default logger;
