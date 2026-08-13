import {
  addMembersSchema,
  conversationUserParamSchema,
  createDirectSchema,
  createGroupSchema,
  idParamSchema,
  memberRoleSchema,
  messageQuerySchema,
  muteSchema,
  pinSchema,
  requestActionSchema,
  sendMessageSchema,
  updateGroupSchema,
} from '@/validators/schemas';
import { validateBody, validateParams, validateQueryParams } from '@/validators';
import ConversationController from '@/controllers/conversation';
import { requireAuth } from '@/middlewares/auth';
import { Router } from 'express';

const ConversationRouter: Router = Router();

ConversationRouter.use(requireAuth);

ConversationRouter.get('/', ConversationController.list);
ConversationRouter.get('/requests', ConversationController.listRequests);
ConversationRouter.post('/direct', validateBody(createDirectSchema), ConversationController.createDirect);
ConversationRouter.post('/group', validateBody(createGroupSchema), ConversationController.createGroup);

ConversationRouter.get('/:id', validateParams(idParamSchema), ConversationController.detail);
ConversationRouter.patch(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateGroupSchema),
  ConversationController.updateGroup
);

ConversationRouter.post(
  '/:id/members',
  validateParams(idParamSchema),
  validateBody(addMembersSchema),
  ConversationController.addMembers
);
ConversationRouter.patch(
  '/:id/members/:userId',
  validateParams(conversationUserParamSchema),
  validateBody(memberRoleSchema),
  ConversationController.updateMemberRole
);
ConversationRouter.delete(
  '/:id/members/:userId',
  validateParams(conversationUserParamSchema),
  ConversationController.removeMember
);

ConversationRouter.post('/:id/leave', validateParams(idParamSchema), ConversationController.leave);
ConversationRouter.patch(
  '/:id/pin',
  validateParams(idParamSchema),
  validateBody(pinSchema),
  ConversationController.setPinned
);
ConversationRouter.patch(
  '/:id/mute',
  validateParams(idParamSchema),
  validateBody(muteSchema),
  ConversationController.setMuted
);
ConversationRouter.post(
  '/:id/request',
  validateParams(idParamSchema),
  validateBody(requestActionSchema),
  ConversationController.respondToRequest
);

ConversationRouter.get(
  '/:id/messages',
  validateParams(idParamSchema),
  validateQueryParams(messageQuerySchema),
  ConversationController.listMessages
);
ConversationRouter.post(
  '/:id/messages',
  validateParams(idParamSchema),
  validateBody(sendMessageSchema),
  ConversationController.sendMessage
);

export default ConversationRouter;
