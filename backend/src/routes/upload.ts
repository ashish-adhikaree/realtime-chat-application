import { uploadRequestSchema } from '@/validators/schemas';
import UploadController from '@/controllers/upload';
import { requireAuth } from '@/middlewares/auth';
import { validateBody } from '@/validators';
import { Router } from 'express';

const UploadRouter: Router = Router();

UploadRouter.use(requireAuth);

UploadRouter.post('/', validateBody(uploadRequestSchema), UploadController.create);

export default UploadRouter;
