import { asyncHandler, currentUserId } from '@/controllers';
import * as userService from '@/services/user';

const UserController = {
  me: asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    await userService.ensureProfile(userId);
    res.json(await userService.getProfile(userId));
  }),

  updateProfile: asyncHandler(async (req, res) => {
    res.json(await userService.updateProfile(currentUserId(req), req.body));
  }),

  updateSettings: asyncHandler(async (req, res) => {
    res.json(await userService.updateSettings(currentUserId(req), req.body));
  }),

  setAvatar: asyncHandler(async (req, res) => {
    res.json(await userService.setAvatar(currentUserId(req), req.body.objectKey));
  }),

  search: asyncHandler(async (req, res) => {
    res.json(await userService.searchUsers(currentUserId(req), String(req.query.q)));
  }),
};

export default UserController;
