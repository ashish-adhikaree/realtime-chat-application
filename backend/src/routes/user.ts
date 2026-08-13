import { avatarSchema, searchQuerySchema, updateProfileSchema, updateSettingsSchema } from '@/validators/schemas';
import { validateBody, validateQueryParams } from '@/validators';
import UserController from '@/controllers/user';
import { requireAuth } from '@/middlewares/auth';
import { Router } from 'express';

const UserRouter: Router = Router();

UserRouter.use(requireAuth);

UserRouter.get('/me', UserController.me);
UserRouter.patch('/me', validateBody(updateProfileSchema), UserController.updateProfile);
UserRouter.patch('/me/settings', validateBody(updateSettingsSchema), UserController.updateSettings);
UserRouter.put('/me/avatar', validateBody(avatarSchema), UserController.setAvatar);
UserRouter.get('/search', validateQueryParams(searchQuerySchema), UserController.search);

export default UserRouter;
