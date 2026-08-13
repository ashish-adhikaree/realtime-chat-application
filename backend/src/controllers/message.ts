import { asyncHandler, currentUserId } from '@/controllers';
import * as messageService from '@/services/message';

const MessageController = {
  remove: asyncHandler(async (req, res) => {
    await messageService.deleteMessage(currentUserId(req), req.params.id!);
    res.status(204).end();
  }),

  setReaction: asyncHandler(async (req, res) => {
    await messageService.setReaction(currentUserId(req), req.params.id!, req.body.emoji);
    res.status(204).end();
  }),

  removeReaction: asyncHandler(async (req, res) => {
    await messageService.removeReaction(currentUserId(req), req.params.id!);
    res.status(204).end();
  }),
};

export default MessageController;
