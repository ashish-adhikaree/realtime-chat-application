import { addContactSchema, blockSchema, updateContactSchema, userIdParamSchema } from '@/validators/schemas';
import { validateBody, validateParams } from '@/validators';
import ContactController from '@/controllers/contact';
import { requireAuth } from '@/middlewares/auth';
import { Router } from 'express';

const ContactRouter: Router = Router();

ContactRouter.use(requireAuth);

ContactRouter.get('/blocked', ContactController.listBlocked);
ContactRouter.post('/blocked', validateBody(blockSchema), ContactController.block);
ContactRouter.delete('/blocked/:userId', validateParams(userIdParamSchema), ContactController.unblock);

ContactRouter.get('/', ContactController.list);
ContactRouter.post('/', validateBody(addContactSchema), ContactController.add);
ContactRouter.patch(
  '/:userId',
  validateParams(userIdParamSchema),
  validateBody(updateContactSchema),
  ContactController.update
);
ContactRouter.delete('/:userId', validateParams(userIdParamSchema), ContactController.remove);

export default ContactRouter;
