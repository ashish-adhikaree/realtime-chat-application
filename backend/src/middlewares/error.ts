import { NextFunction, Request, Response } from 'express';
import logger from '@/lib/utils/logger';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
	const log = logger();
	log.error(err);
	if (err instanceof ValidationError) {
		return res.status(err.status).json({ error: err.message, details: err.details });
	}

	if (err instanceof NotFoundError) {
		return res.status(err.status).json({ error: err.message });
	}

	if (err instanceof CustomError) {
		return res.status(err.status).json({ error: err.message, details: err.details });
	}

	res.status(500).json({ error: 'Internal Server Error' });
}

export class CustomError extends Error {
	status: number;
	details?: Record<string, any>;

	constructor(message: string, status = 500, details?: Record<string, any>) {
		super(message);
		this.status = status;
		this.details = details;
		Object.setPrototypeOf(this, new.target.prototype);
	}
}

export class ValidationError extends CustomError {
	constructor(message = 'Invalid input', details?: Record<string, any>) {
		super(message, 400, details);
	}
}

export class NotFoundError extends CustomError {
	constructor(message = 'Resource not found') {
		super(message, 404);
	}
}

export class UnAuthorizedError extends CustomError {
	constructor(message = 'Unauthorized access') {
		super(message, 401);
	}
}