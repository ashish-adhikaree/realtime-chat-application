import ConversationRouter from '@/routes/conversation';
import ContactRouter from '@/routes/contact';
import MessageRouter from '@/routes/message';
import UploadRouter from '@/routes/upload';
import UserRouter from '@/routes/user';
import { Router } from 'express';

const ApiRouter: Router = Router();

ApiRouter.use('/users', UserRouter);
ApiRouter.use('/contacts', ContactRouter);
ApiRouter.use('/conversations', ConversationRouter);
ApiRouter.use('/messages', MessageRouter);
ApiRouter.use('/uploads', UploadRouter);

export default ApiRouter;
