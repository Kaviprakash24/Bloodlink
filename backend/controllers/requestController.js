import BloodRequest from '../models/BloodRequest.js';
import Hospital from '../models/Hospital.js';
import { findMatchesForRequest } from '../services/matchingService.js';

// @desc    Create a blood request
// @route   POST /api/requests
// @access  Private (Requester / Hospital)
export const createBloodRequest = async (req, res) => {
    try {
        const { hospitalId, bloodGroupRequired, unitsRequired, patientName, city, postalCode, urgency, requiredBy } = req.body;

        let derivedHospitalId = hospitalId;
        let hospital;

        if (req.user.role === 'HOSPITAL_ADMIN') {
            hospital = await Hospital.findOne({ adminId: req.user._id });
            if (!hospital) {
                return res.status(403).json({ message: 'Hospital profile not found for this admin.' });
            }
            if (hospital.verificationStatus !== 'VERIFIED') {
                return res.status(403).json({ message: 'Your hospital is not VERIFIED. You cannot create operational requests.' });
            }
            derivedHospitalId = hospital._id;
        } else {
            // For normal REQUESTER
            hospital = await Hospital.findById(derivedHospitalId);
            if (!hospital) {
                return res.status(404).json({ message: 'Hospital not found' });
            }
            if (hospital.verificationStatus !== 'VERIFIED') {
                return res.status(400).json({ message: 'Selected hospital is not VERIFIED and cannot receive requests.' });
            }
        }

        const requestData = {
            requesterId: req.user._id,
            hospitalId: derivedHospitalId,
            bloodGroupRequired,
            unitsRequired,
            patientName,
            city,
            postalCode,
            urgency,
            requiredBy
        };
        
        // Strictly inherit hospital location to prevent duplicate/fake coordinates
        if (hospital.location && hospital.location.coordinates && hospital.location.coordinates.length === 2 && hospital.location.coordinates[0] !== 0) {
            requestData.location = hospital.location;
        }

        const request = await BloodRequest.create(requestData);

        res.status(201).json(request);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error creating request' });
    }
};

// @desc    Get matching donors for a specific request
// @route   GET /api/requests/:id/matches
// @access  Private (Requester of the request / Admin)
export const getMatchingDonors = async (req, res) => {
    try {
        const request = await BloodRequest.findById(req.params.id);
        
        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }

        // Authorization check: Only the requester or an admin should see matches
        if (request.requesterId.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Not authorized to view matches for this request' });
        }

        // Dynamic Expiration Check
        if (new Date(request.requiredBy) < new Date() && request.status !== 'EXPIRED') {
            request.status = 'EXPIRED';
            await request.save();
        }

        if (request.status === 'EXPIRED' || request.status === 'CANCELLED' || request.status === 'FULFILLED') {
            return res.status(400).json({ message: `Cannot view matches. Request is ${request.status}` });
        }

        // Call matching service (default 10km radius for MVP)
        const { findMatchesForRequest } = await import('../services/matchingService.js');
        const matches = await findMatchesForRequest(request, 10000);
        
        res.json({
            requestDetails: {
                bloodGroupRequired: request.bloodGroupRequired,
                unitsRequired: request.unitsRequired,
                status: request.status
            },
            matchCount: matches.length,
            matches
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error finding matches' });
    }
};

// @desc    Get nearby blood requests for a donor
// @route   GET /api/requests/nearby
// @access  Private (Donor only)
export const getNearbyRequests = async (req, res) => {
    try {
        // Need to import DonorProfile here to get the donor's coordinates
        const DonorProfile = (await import('../models/DonorProfile.js')).default;
        const { findRequestsForDonor } = await import('../services/matchingService.js');

        const donorProfile = await DonorProfile.findOne({ userId: req.user._id });
        
        if (!donorProfile) {
            return res.status(404).json({ message: 'Donor profile not found. Please complete your profile first.' });
        }

        // Only active donors should see matches
        if (!donorProfile.isAvailable) {
            return res.json([]);
        }

        const requests = await findRequestsForDonor(donorProfile, 10000); // 10km radius
        
        res.json(requests);
    } catch (error) {
        console.error('Error fetching nearby requests:', error);
        res.status(500).json({ message: 'Server error fetching nearby requests' });
    }
};

// @desc    Get requests created by the current user
// @route   GET /api/requests/my-requests
// @access  Private (Requester / Hospital)
export const getMyRequests = async (req, res) => {
    try {
        const BloodRequest = (await import('../models/BloodRequest.js')).default;
        let query = { requesterId: req.user._id };

        if (req.user.role === 'HOSPITAL_ADMIN') {
            const Hospital = (await import('../models/Hospital.js')).default;
            const hospital = await Hospital.findOne({ adminId: req.user._id });
            if (hospital) {
                // If they are a hospital, they see ALL requests assigned to their hospital
                query = { hospitalId: hospital._id };
            }
        }
        
        const requests = await BloodRequest.find(query)
            .sort({ createdAt: -1 })
            .populate('hospitalId', 'name city verificationStatus');
            
        res.json(requests);
    } catch (error) {
        console.error('Error fetching my requests:', error);
        res.status(500).json({ message: 'Server error fetching your requests' });
    }
};

// @desc    Cancel a blood request
// @route   PUT /api/requests/:id/cancel
// @access  Private (Requester / Admin)
export const cancelBloodRequest = async (req, res) => {
    try {
        const BloodRequest = (await import('../models/BloodRequest.js')).default;
        const Donation = (await import('../models/Donation.js')).default;
        
        const request = await BloodRequest.findById(req.params.id);
        
        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }

        // Authorization check
        let isAuthorized = false;
        if (req.user.role === 'ADMIN') {
            isAuthorized = true;
        } else if (req.user.role === 'HOSPITAL_ADMIN') {
            const Hospital = (await import('../models/Hospital.js')).default;
            const hospital = await Hospital.findOne({ adminId: req.user._id });
            if (hospital && request.hospitalId.toString() === hospital._id.toString()) {
                isAuthorized = true;
            }
        } else if (request.requesterId.toString() === req.user._id.toString()) {
            isAuthorized = true;
        }

        if (!isAuthorized) {
            return res.status(403).json({ message: 'Not authorized to cancel this request' });
        }

        if (request.status === 'FULFILLED') {
            return res.status(400).json({ message: 'Cannot cancel a fulfilled request' });
        }

        if (request.status === 'CANCELLED') {
            return res.status(400).json({ message: 'Request is already cancelled' });
        }

        request.status = 'CANCELLED';
        await request.save();

        // Cascade cancel all pending (REQUESTED) invitations
        const pendingDonations = await Donation.find({ requestId: request._id, status: 'REQUESTED' });

        await Donation.updateMany(
            { requestId: request._id, status: 'REQUESTED' },
            { $set: { status: 'CANCELLED' } }
        );

        const { notifyRequestCancelled } = await import('../services/notificationService.js');
        for (const donation of pendingDonations) {
            await notifyRequestCancelled(donation.donorId, request._id);
        }

        res.json({ message: 'Blood request cancelled successfully', request });
    } catch (error) {
        console.error('Error cancelling request:', error);
        res.status(500).json({ message: 'Server error cancelling request' });
    }
};
