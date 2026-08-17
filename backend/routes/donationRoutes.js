import express from 'express';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';
import {
    inviteDonor,
    respondToInvitation,
    completeDonation,
    getIncomingInvitations,
    getMyInvitations,
    volunteerForRequest,
    updateTransportMode,
    cancelPickupRequest,
    respondToPickupRequest,
    dispatchPickup,
    markDonorArrived,
    getDonationMessages,
    sendDonationMessage
} from '../controllers/donationController.js';

const router = express.Router();

// Require authentication for all donation routes
router.use(protect);

// Requester / Hospital routes
router.post('/invite', authorizeRoles('REQUESTER', 'ADMIN'), inviteDonor);
router.get('/my-requests', authorizeRoles('REQUESTER', 'HOSPITAL_ADMIN', 'ADMIN'), getMyInvitations);

// Donor routes
router.put('/:id/respond', authorizeRoles('DONOR'), respondToInvitation);
router.get('/incoming', authorizeRoles('DONOR'), getIncomingInvitations);
router.post('/volunteer', authorizeRoles('DONOR'), volunteerForRequest);

// Donor Transport Workflow
router.put('/:id/transport', authorizeRoles('DONOR'), updateTransportMode);
router.put('/:id/pickup/cancel', authorizeRoles('DONOR'), cancelPickupRequest);

// Hospital Pickup Workflow
router.put('/:id/pickup/respond', authorizeRoles('HOSPITAL_ADMIN', 'ADMIN'), respondToPickupRequest);
router.put('/:id/pickup/dispatch', authorizeRoles('HOSPITAL_ADMIN', 'ADMIN'), dispatchPickup);
router.put('/:id/arrived', authorizeRoles('HOSPITAL_ADMIN', 'ADMIN'), markDonorArrived);

// Hospital / Admin routes for completion
router.put('/:id/complete', authorizeRoles('HOSPITAL_ADMIN', 'ADMIN'), completeDonation);

// Real-Time Chat (Phase 8) - Shared by Donor & Hospital Admin
router.get('/:id/messages', getDonationMessages);
router.post('/:id/messages', sendDonationMessage);

export default router;
