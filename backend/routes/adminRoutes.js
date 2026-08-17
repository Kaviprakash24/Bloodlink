import express from 'express';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';
import { getPendingHospitals, getHospitalDetails, updateHospitalVerification } from '../controllers/adminController.js';
import { 
    getOverview, 
    getBloodGroupDemand, 
    getRequestStatus, 
    getPerformanceMetrics, 
    getLocationInsights, 
    getTimeTrends 
} from '../controllers/analyticsController.js';

const router = express.Router();

// Require authentication and ADMIN role for all admin routes
router.use(protect);
router.use(authorizeRoles('ADMIN'));

// Analytics Routes
router.get('/analytics/overview', getOverview);
router.get('/analytics/blood-groups', getBloodGroupDemand);
router.get('/analytics/status', getRequestStatus);
router.get('/analytics/performance', getPerformanceMetrics);
router.get('/analytics/locations', getLocationInsights);
router.get('/analytics/trends', getTimeTrends);

// Hospital Verification routes
router.get('/hospitals/pending', getPendingHospitals);
router.get('/hospitals/:id', getHospitalDetails);
router.put('/hospitals/:id/verify', updateHospitalVerification);

export default router;
