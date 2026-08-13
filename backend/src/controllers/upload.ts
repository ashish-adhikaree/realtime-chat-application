import { asyncHandler, currentUserId } from '@/controllers';
import * as uploadService from '@/services/upload';

const UploadController = {
  create: asyncHandler(async (req, res) => {
    res.json(await uploadService.requestUploadUrl(currentUserId(req), req.body.purpose, req.body.mimeType));
  }),
};

export default UploadController;
