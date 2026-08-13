import { idParamSchema, reactionSchema } from '@/validators/schemas';
import { validateBody, validateParams } from '@/validators';
import MessageController from '@/controllers/message';
import { requireAuth } from '@/middlewares/auth';
import { Router } from 'express';

const MessageRouter: Router = Router();

MessageRouter.use(requireAuth);

MessageRouter.delete('/:id', validateParams(idParamSchema), MessageController.remove);
MessageRouter.put(
  '/:id/reaction',
  validateParams(idParamSchema),
  validateBody(reactionSchema),
  MessageController.setReaction
);
MessageRouter.delete('/:id/reaction', validateParams(idParamSchema), MessageController.removeReaction);

export default MessageRouter;
