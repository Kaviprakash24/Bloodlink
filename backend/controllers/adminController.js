import Hospital from '../models/Hospital.js';
import User from '../models/User.js';
import { notifyHospitalVerification } from '../services/notificationService.js';

// @desc    Get all pending hospitals
// @route   GET /api/admin/hospitals/pending
// @access  Private (ADMIN)
export const getPendingHospitals = async (req, res) => {
    try {
        const hospitals = await Hospital.find({ verificationStatus: 'PENDING' })
            .populate('adminId', 'firstName lastName email phone')
            .sort({ createdAt: 1 }); // Oldest first
        res.json(hospitals);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get a specific hospital's details
// @route   GET /api/admin/hospitals/:id
// @access  Private (ADMIN)
export const getHospitalDetails = async (req, res) => {
    try {
        const hospital = await Hospital.findById(req.params.id)
            .populate('adminId', 'firstName lastName email phone');
            
        if (!hospital) {
            return res.status(404).json({ message: 'Hospital not found' });
        }
        res.json(hospital);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update hospital verification status
// @route   PUT /api/admin/hospitals/:id/verify
// @access  Private (ADMIN)
export const updateHospitalVerification = async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['VERIFIED', 'REJECTED', 'SUSPENDED', 'PENDING'];
        
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status provided.' });
        }

        const hospital = await Hospital.findById(req.params.id);
        
        if (!hospital) {
            return res.status(404).json({ message: 'Hospital not found' });
        }

        // Only update if it's changing
        if (hospital.verificationStatus !== status) {
            hospital.verificationStatus = status;
            await hospital.save();

            // Notify the hospital admin
            await notifyHospitalVerification(hospital.adminId, status);
        }

        res.json(hospital);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};
