import { NextFunction, Request, Response } from 'express';
import { getNamespace } from 'cls-hooked';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';

export default function LogContextMiddleware(req: Request, res: Response, next: NextFunction) {
	const ns = getNamespace('request')!;

	return ns.run(() => {
		ns.set('requestId', uuidv4());
		ns.set('clientIp', req.ip);
		ns.set('machineName', os.hostname());
		ns.set('userAgent', req.get('User-Agent') || 'unknown');
		ns.set('route', req.originalUrl);
		ns.set('method', req.method);
		next();
	});
}