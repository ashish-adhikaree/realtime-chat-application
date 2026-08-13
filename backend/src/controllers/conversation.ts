import * as conversationService from '@/services/conversation';
import { asyncHandler, currentUserId } from '@/controllers';
import * as messageService from '@/services/message';

const ConversationController = {
  list: asyncHandler(async (req, res) => {
    res.json(await conversationService.listConversations(currentUserId(req)));
  }),

  listRequests: asyncHandler(async (req, res) => {
    res.json(await conversationService.listPendingRequests(currentUserId(req)));
  }),

  createDirect: asyncHandler(async (req, res) => {
    const id = await conversationService.createDirectConversation(currentUserId(req), req.body.userId);
    res.status(201).json({ id });
  }),

  createGroup: asyncHandler(async (req, res) => {
    const id = await conversationService.createGroupConversation(currentUserId(req), req.body);
    res.status(201).json({ id });
  }),

  detail: asyncHandler(async (req, res) => {
    res.json(await conversationService.getConversationDetail(currentUserId(req), req.params.id!));
  }),

  updateGroup: asyncHandler(async (req, res) => {
    res.json(await conversationService.updateGroup(currentUserId(req), req.params.id!, req.body));
  }),

  addMembers: asyncHandler(async (req, res) => {
    res.json(
      await conversationService.addMembers(
        currentUserId(req),
        req.params.id!,
        req.body.userIds,
        req.body.includeHistory
      )
    );
  }),

  updateMemberRole: asyncHandler(async (req, res) => {
    res.json(
      await conversationService.updateMemberRole(
        currentUserId(req),
        req.params.id!,
        req.params.userId!,
        req.body.role
      )
    );
  }),

  removeMember: asyncHandler(async (req, res) => {
    res.json(await conversationService.removeMember(currentUserId(req), req.params.id!, req.params.userId!));
  }),

  leave: asyncHandler(async (req, res) => {
    await conversationService.leaveConversation(currentUserId(req), req.params.id!);
    res.status(204).end();
  }),

  setPinned: asyncHandler(async (req, res) => {
    await conversationService.setPinned(currentUserId(req), req.params.id!, req.body.pinned);
    res.status(204).end();
  }),

  setMuted: asyncHandler(async (req, res) => {
    await conversationService.setMuted(currentUserId(req), req.params.id!, req.body.mutedUntil);
    res.status(204).end();
  }),

  respondToRequest: asyncHandler(async (req, res) => {
    await conversationService.respondToRequest(currentUserId(req), req.params.id!, req.body.action);
    res.status(204).end();
  }),

  listMessages: asyncHandler(async (req, res) => {
    const before = req.query.before ? Number(req.query.before) : undefined;
    res.json(await messageService.listMessages(currentUserId(req), req.params.id!, before));
  }),

  sendMessage: asyncHandler(async (req, res) => {
    res.status(201).json(await messageService.sendMessage(currentUserId(req), req.params.id!, req.body));
  }),
};

export default ConversationController;
