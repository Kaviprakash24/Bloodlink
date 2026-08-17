import express from 'express';
import { createBloodRequest, getMatchingDonors, getNearbyRequests, getMyRequests, cancelBloodRequest } from '../controllers/requestController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, authorizeRoles('REQUESTER', 'HOSPITAL_ADMIN'), createBloodRequest);
router.get('/my-requests', protect, authorizeRoles('REQUESTER', 'HOSPITAL_ADMIN'), getMyRequests);
router.get('/nearby', protect, authorizeRoles('DONOR'), getNearbyRequests);
router.get('/:id/matches', protect, getMatchingDonors);
router.put('/:id/cancel', protect, authorizeRoles('REQUESTER', 'HOSPITAL_ADMIN'), cancelBloodRequest);

export default router;
