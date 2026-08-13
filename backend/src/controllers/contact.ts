import { asyncHandler, currentUserId } from '@/controllers';
import * as contactService from '@/services/contact';

const ContactController = {
  list: asyncHandler(async (req, res) => {
    res.json(await contactService.listContacts(currentUserId(req)));
  }),

  add: asyncHandler(async (req, res) => {
    res.status(201).json(await contactService.addContact(currentUserId(req), req.body.userId, req.body.alias));
  }),

  update: asyncHandler(async (req, res) => {
    res.json(await contactService.updateContact(currentUserId(req), req.params.userId!, req.body));
  }),

  remove: asyncHandler(async (req, res) => {
    res.json(await contactService.removeContact(currentUserId(req), req.params.userId!));
  }),

  listBlocked: asyncHandler(async (req, res) => {
    res.json(await contactService.listBlocked(currentUserId(req)));
  }),

  block: asyncHandler(async (req, res) => {
    res.status(201).json(await contactService.blockUser(currentUserId(req), req.body.userId));
  }),

  unblock: asyncHandler(async (req, res) => {
    res.json(await contactService.unblockUser(currentUserId(req), req.params.userId!));
  }),
};

export default ContactController;
