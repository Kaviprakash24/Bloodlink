import express from 'express';
import { updateDonorProfile, getDonorProfile } from '../controllers/donorController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/profile', protect, authorizeRoles('DONOR'), getDonorProfile);
router.put('/profile', protect, authorizeRoles('DONOR'), updateDonorProfile);

export default router;
