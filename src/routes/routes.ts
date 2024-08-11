import userRoutes from './usersRoutes';
import { Router } from 'express';

const router = Router();
router.use(userRoutes);

export default router;
