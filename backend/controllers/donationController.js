import Donation from '../models/Donation.js';
import BloodRequest from '../models/BloodRequest.js';
import { 
    notifyNewDonationRequest, 
    notifyDonationAccepted, 
    notifyDonationRejected, 
    notifyDonationCompleted, 
    notifyRequestFulfilled,
    sendNotification
} from '../services/notificationService.js';

// @desc    Invite a donor to a blood request
// @route   POST /api/donations/invite
// @access  Private (Requester)
export const inviteDonor = async (req, res) => {
    try {
        const { requestId, donorId, distanceText } = req.body; // allow distanceText optionally
        const requesterId = req.user._id;

        // 1. Validate Blood Request ownership
        const bloodRequest = await BloodRequest.findById(requestId);
        if (!bloodRequest) {
            return res.status(404).json({ message: 'Blood request not found' });
        }
        if (bloodRequest.requesterId.toString() !== requesterId.toString()) {
            return res.status(403).json({ message: 'Not authorized to invite donors for this request' });
        }
        
        if (bloodRequest.status !== 'OPEN' && bloodRequest.status !== 'PARTIALLY_FULFILLED') {
            return res.status(400).json({ message: `Blood request is not open for new donors (${bloodRequest.status})` });
        }

        // Dynamic Request Expiration check
        if (new Date(bloodRequest.requiredBy) < new Date()) {
            return res.status(400).json({ message: 'Cannot invite donors. The blood request has expired.' });
        }

        // Invitation Cap check
        const activeInvitesCount = await Donation.countDocuments({
            requestId,
            status: { $in: ['REQUESTED', 'ACCEPTED'] }
        });

        const remainingNeed = bloodRequest.unitsRequired - bloodRequest.unitsFulfilled;
        const invitationCap = remainingNeed * 3;
        if (activeInvitesCount >= invitationCap) {
            return res.status(400).json({ message: `Invitation cap reached. You can only have ${invitationCap} active invitations for the remaining need of ${remainingNeed} units.` });
        }

        // 2. Prevent duplicate active invitations
        const existingDonation = await Donation.findOne({
            requestId,
            donorId,
            status: { $in: ['REQUESTED', 'ACCEPTED'] }
        });

        if (existingDonation) {
            return res.status(400).json({ message: 'Donor has already been invited and the invitation is active' });
        }

        // 3. Create Donation record
        const donation = await Donation.create({
            requestId,
            donorId,
            requesterId,
            status: 'REQUESTED'
        });

        // NOTIFY DONOR
        await notifyNewDonationRequest(donorId, bloodRequest, distanceText);

        res.status(201).json(donation);
    } catch (error) {
        console.error(error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Duplicate active invitation exists' });
        }
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Volunteer for a blood request (Donor initiated)
// @route   POST /api/donations/volunteer
// @access  Private (Donor)
export const volunteerForRequest = async (req, res) => {
    try {
        const { requestId } = req.body;
        const donorId = req.user._id;

        // 1. Validate Blood Request
        const bloodRequest = await BloodRequest.findById(requestId);
        if (!bloodRequest) {
            return res.status(404).json({ message: 'Blood request not found' });
        }
        if (bloodRequest.status !== 'OPEN' && bloodRequest.status !== 'PARTIALLY_FULFILLED') {
            return res.status(400).json({ message: `Blood request is not open for new donors (${bloodRequest.status})` });
        }
        if (new Date(bloodRequest.requiredBy) < new Date()) {
            return res.status(400).json({ message: 'Cannot volunteer. The blood request has expired.' });
        }

        // 2. Double-Commitment check (Donor)
        const activeCommitment = await Donation.findOne({
            donorId,
            status: 'ACCEPTED'
        });
        if (activeCommitment) {
            return res.status(400).json({ message: 'You already have an active accepted donation. Please complete or cancel it before volunteering for another.' });
        }

        // 3. Prevent duplicate interaction with this request
        const existingDonation = await Donation.findOne({
            requestId,
            donorId,
            status: { $in: ['REQUESTED', 'ACCEPTED', 'REJECTED'] }
        });
        if (existingDonation) {
            return res.status(400).json({ message: 'You have already interacted with this request.' });
        }

        // 4. Invitation Cap / Fulfillment check
        const activeInvitesCount = await Donation.countDocuments({
            requestId,
            status: { $in: ['REQUESTED', 'ACCEPTED'] }
        });
        const remainingNeed = bloodRequest.unitsRequired - bloodRequest.unitsFulfilled;
        if (remainingNeed <= 0) {
            return res.status(400).json({ message: 'This request has already been fully fulfilled.' });
        }
        const invitationCap = remainingNeed * 3;
        if (activeInvitesCount >= invitationCap) {
            return res.status(400).json({ message: 'This request has already reached its maximum number of active donors. Please try another request.' });
        }

        // 5. Create Donation record (Directly as ACCEPTED since donor initiated)
        const donation = await Donation.create({
            requestId,
            donorId,
            requesterId: bloodRequest.requesterId,
            status: 'ACCEPTED',
            acceptedAt: Date.now()
        });

        // 6. NOTIFY REQUESTER
        await notifyDonationAccepted(bloodRequest.requesterId, donation._id, bloodRequest._id);

        res.status(201).json(donation);
    } catch (error) {
        console.error(error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Duplicate active donation exists' });
        }
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Accept or reject a donation invitation
// @route   PUT /api/donations/:id/respond
// @access  Private (Donor)
export const respondToInvitation = async (req, res) => {
    try {
        const { id } = req.params;
        const { response } = req.body; // 'ACCEPT' or 'REJECT'
        const donorId = req.user._id;

        if (!['ACCEPT', 'REJECT'].includes(response)) {
            return res.status(400).json({ message: 'Invalid response' });
        }

        const donation = await Donation.findById(id);
        if (!donation) {
            return res.status(404).json({ message: 'Donation request not found' });
        }

        if (donation.donorId.toString() !== donorId.toString()) {
            return res.status(403).json({ message: 'Not authorized to respond to this invitation' });
        }

        if (donation.status !== 'REQUESTED') {
            return res.status(400).json({ message: `Cannot respond. Invitation is currently ${donation.status}` });
        }

        const bloodRequest = await BloodRequest.findById(donation.requestId);
        if (!bloodRequest) {
            return res.status(404).json({ message: 'Associated blood request not found' });
        }

        // Dynamic Request Expiration/Cancellation check
        if (new Date(bloodRequest.requiredBy) < new Date() || bloodRequest.status === 'EXPIRED' || bloodRequest.status === 'CANCELLED' || bloodRequest.status === 'FULFILLED') {
            return res.status(400).json({ message: `Cannot respond. The blood request is no longer active (${bloodRequest.status}).` });
        }

        if (response === 'ACCEPT') {
            // Check for existing active commitment
            const activeCommitment = await Donation.findOne({
                donorId,
                status: 'ACCEPTED'
            });

            if (activeCommitment) {
                return res.status(400).json({ message: 'You already have an active accepted donation. Please complete or cancel it before accepting another.' });
            }

            // Using findOneAndUpdate to atomically accept and prevent double-clicks
            const updatedDonation = await Donation.findOneAndUpdate(
                { _id: id, status: 'REQUESTED' },
                { status: 'ACCEPTED', acceptedAt: Date.now() },
                { new: true }
            );

            if (!updatedDonation) {
                return res.status(400).json({ message: 'Donation is no longer in REQUESTED state.' });
            }

            // NOTIFY REQUESTER
            await notifyDonationAccepted(bloodRequest.requesterId, updatedDonation._id, bloodRequest._id);

            return res.json(updatedDonation);
        } else {
            donation.status = 'REJECTED';
            await donation.save();

            // NOTIFY REQUESTER
            await notifyDonationRejected(bloodRequest.requesterId, donation._id, bloodRequest._id);

            return res.json(donation);
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Mark a donation as completed
// @route   PUT /api/donations/:id/complete
// @access  Private (Hospital/Admin)
export const completeDonation = async (req, res) => {
    try {
        const { id } = req.params;
        
        const donation = await Donation.findById(id);
        if (!donation) {
            return res.status(404).json({ message: 'Donation not found' });
        }

        if (donation.status !== 'ACCEPTED') {
            return res.status(400).json({ message: `Cannot complete. Status is ${donation.status}` });
        }

        const bloodRequestRecord = await BloodRequest.findById(donation.requestId);
        if (!bloodRequestRecord) {
            return res.status(404).json({ message: 'Associated blood request not found' });
        }

        // Ownership and Verification Check for HOSPITAL_ADMIN
        if (req.user.role === 'HOSPITAL_ADMIN') {
            const Hospital = (await import('../models/Hospital.js')).default;
            const hospital = await Hospital.findOne({ adminId: req.user._id });
            
            if (!hospital) {
                return res.status(403).json({ message: 'Hospital profile not found for this admin' });
            }
            if (hospital.verificationStatus !== 'VERIFIED') {
                return res.status(403).json({ message: 'Only VERIFIED hospitals can complete donations.' });
            }
            if (bloodRequestRecord.hospitalId.toString() !== hospital._id.toString()) {
                return res.status(403).json({ message: 'Not authorized: This request does not belong to your hospital.' });
            }
        } else if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Only Hospital Admins and Platform Admins can complete donations.' });
        }

        // Atomically increment unitsFulfilled on blood request
        const unitsDonated = donation.unitsDonated || 1;
        const bloodRequest = await BloodRequest.findOneAndUpdate(
            {
                _id: donation.requestId,
                // Condition: Ensure we don't over-fulfill
                $expr: { $lte: [{ $add: ["$unitsFulfilled", unitsDonated] }, "$unitsRequired"] }
            },
            {
                $inc: { unitsFulfilled: unitsDonated }
            },
            { new: true } // Return the updated document
        );

        if (!bloodRequest) {
            // Check if the request exists but just failed the condition
            const existingRequest = await BloodRequest.findById(donation.requestId);
            if (!existingRequest) {
                return res.status(404).json({ message: 'Associated blood request not found' });
            } else {
                return res.status(400).json({ message: `Cannot complete: Adding ${unitsDonated} unit(s) would exceed the remaining required units.` });
            }
        }

        // Evaluate if it's FULFILLED or PARTIALLY_FULFILLED
        if (bloodRequest.unitsFulfilled >= bloodRequest.unitsRequired) {
            bloodRequest.status = 'FULFILLED';
        } else {
            bloodRequest.status = 'PARTIALLY_FULFILLED';
        }
        await bloodRequest.save();

        // Mark donation as completed
        donation.status = 'COMPLETED';
        donation.completedAt = Date.now();
        await donation.save();

        // NOTIFY REQUESTER
        await notifyDonationCompleted(bloodRequest.requesterId, donation._id, bloodRequest._id);

        // Optional: if FULFILLED, cancel all other REQUESTED/ACCEPTED donations?
        // Wait, ACCEPTED donations might still arrive. It's safer to let the hospital handle it or just reject new acceptances.
        if (bloodRequest.status === 'FULFILLED') {
            await Donation.updateMany(
                { requestId: bloodRequest._id, status: 'REQUESTED' },
                { $set: { status: 'CANCELLED' } } // Cancel pending invites since it's full
            );

            // NOTIFY REQUESTER
            await notifyRequestFulfilled(bloodRequest.requesterId, bloodRequest._id);
        }

        res.json({ donation, bloodRequest });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get incoming invitations for the logged-in donor
// @route   GET /api/donations/incoming
// @access  Private (Donor)
export const getIncomingInvitations = async (req, res) => {
    try {
        const donorId = req.user._id;

        const invitations = await Donation.find({ donorId })
            .populate({
                path: 'requestId',
                select: '-location -patientName', // Security: Hide exact location and patient name from donors before they accept
                populate: {
                    path: 'hospitalId',
                    select: 'name city postalCode contactNumber adminId'
                }
            })
            .sort({ requestedAt: -1 });

        res.json(invitations);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get all invitations sent by the logged-in requester
// @route   GET /api/donations/my-requests
// @access  Private (Requester)
export const getMyInvitations = async (req, res) => {
    try {
        let query = { requesterId: req.user._id };

        if (req.user.role === 'HOSPITAL_ADMIN') {
            const Hospital = (await import('../models/Hospital.js')).default;
            const hospital = await Hospital.findOne({ adminId: req.user._id });
            if (hospital) {
                const BloodRequest = (await import('../models/BloodRequest.js')).default;
                const requests = await BloodRequest.find({ hospitalId: hospital._id }).select('_id');
                const requestIds = requests.map(r => r._id);
                // Override query to fetch by requestId
                query = { requestId: { $in: requestIds } };
            }
        }

        const invitations = await Donation.find(query)
            .populate('donorId', 'firstName lastName') // Safe to show name to requester who invited them
            .populate('requestId', 'bloodGroupRequired unitsRequired status')
            .sort({ requestedAt: -1 });

        res.json(invitations);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// ==========================================
// PHASE 5.6: TRANSPORT & COORDINATION WORKFLOW
// ==========================================

// @desc    Update transport mode (Donor chooses SELF or HOSPITAL_PICKUP)
// @route   PUT /api/donations/:id/transport
// @access  Private (DONOR only)
export const updateTransportMode = async (req, res) => {
    try {
        const { mode } = req.body;
        
        if (!['SELF', 'HOSPITAL_PICKUP'].includes(mode)) {
            return res.status(400).json({ message: 'Invalid transport mode' });
        }

        const donation = await Donation.findById(req.params.id)
            .populate('requestId')
            .populate('requesterId', 'firstName lastName email phone');

        if (!donation) {
            return res.status(404).json({ message: 'Donation not found' });
        }

        if (donation.donorId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        if (donation.status !== 'ACCEPTED') {
            return res.status(400).json({ message: 'Transport can only be coordinated for accepted donations' });
        }
        
        if (donation.pickupStatus === 'DISPATCHED' || donation.pickupStatus === 'ARRIVED') {
            return res.status(400).json({ message: 'Cannot change transport mode after dispatch or arrival' });
        }

        donation.transportMode = mode;
        
        if (mode === 'HOSPITAL_PICKUP') {
            donation.pickupStatus = 'REQUESTED';
            
            // Notify Hospital
            const BloodRequest = (await import('../models/BloodRequest.js')).default;
            const request = await BloodRequest.findById(donation.requestId);
            const Hospital = (await import('../models/Hospital.js')).default;
            const hospital = await Hospital.findById(request.hospitalId);
            
            await sendNotification({
                recipientId: hospital.adminId,
                type: 'PICKUP_REQUESTED',
                title: 'Hospital Pickup Requested',
                message: `A matched donor has requested hospital pickup.`,
                relatedRequestId: request._id,
                relatedDonationId: donation._id
            });
        } else {
            donation.pickupStatus = 'NONE';
        }

        await donation.save();
        res.json(donation);
    } catch (error) {
        console.error('Error updating transport mode:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Cancel a pickup request
// @route   PUT /api/donations/:id/pickup/cancel
// @access  Private (DONOR only)
export const cancelPickupRequest = async (req, res) => {
    try {
        const donation = await Donation.findById(req.params.id);

        if (!donation) {
            return res.status(404).json({ message: 'Donation not found' });
        }

        if (donation.donorId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        if (donation.status !== 'ACCEPTED') {
            return res.status(400).json({ message: 'Donation is not in ACCEPTED state' });
        }

        if (donation.transportMode !== 'HOSPITAL_PICKUP') {
            return res.status(400).json({ message: 'No active hospital pickup request to cancel' });
        }

        if (!['REQUESTED', 'ACCEPTED'].includes(donation.pickupStatus)) {
            return res.status(400).json({ message: `Cannot cancel pickup in ${donation.pickupStatus} state` });
        }

        donation.transportMode = 'SELF';
        donation.pickupStatus = 'CANCELLED';
        await donation.save();

        // Notify Hospital
        const BloodRequest = (await import('../models/BloodRequest.js')).default;
        const request = await BloodRequest.findById(donation.requestId);
        const Hospital = (await import('../models/Hospital.js')).default;
        const hospital = await Hospital.findById(request.hospitalId);

        await sendNotification({
            recipientId: hospital.adminId,
            type: 'PICKUP_CANCELLED',
            title: 'Pickup Cancelled',
            message: `The donor has cancelled their hospital pickup request and will arrange their own transport.`,
            relatedRequestId: request._id,
            relatedDonationId: donation._id
        });

        res.json(donation);
    } catch (error) {
        console.error('Error cancelling pickup:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Hospital Accept/Reject Pickup Request
// @route   PUT /api/donations/:id/pickup/respond
// @access  Private (HOSPITAL_ADMIN, ADMIN)
export const respondToPickupRequest = async (req, res) => {
    try {
        const { status } = req.body;
        
        if (!['ACCEPTED', 'REJECTED'].includes(status)) {
            return res.status(400).json({ message: 'Invalid pickup response status' });
        }

        const donation = await Donation.findById(req.params.id);
        if (!donation) return res.status(404).json({ message: 'Donation not found' });

        const BloodRequest = (await import('../models/BloodRequest.js')).default;
        const request = await BloodRequest.findById(donation.requestId);
        const Hospital = (await import('../models/Hospital.js')).default;
        const hospital = await Hospital.findById(request.hospitalId);

        // Verify ownership
        if (req.user.role === 'HOSPITAL_ADMIN' && hospital.adminId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Unauthorized. You do not own this request.' });
        }

        if (donation.transportMode !== 'HOSPITAL_PICKUP' || donation.pickupStatus !== 'REQUESTED') {
            return res.status(400).json({ message: 'No pending pickup request found for this donation' });
        }

        donation.pickupStatus = status;
        await donation.save();

        // Notify Donor
        await sendNotification({
            recipientId: donation.donorId,
            type: status === 'ACCEPTED' ? 'PICKUP_ACCEPTED' : 'PICKUP_REJECTED',
            title: `Hospital Pickup ${status}`,
            message: status === 'ACCEPTED' 
                ? `The hospital has accepted your pickup request and will dispatch transport.`
                : `The hospital cannot provide transport at this time. Please arrange your own transport to ${hospital.name}.`,
            relatedRequestId: request._id,
            relatedDonationId: donation._id
        });

        res.json(donation);
    } catch (error) {
        console.error('Error responding to pickup:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Hospital Dispatch Pickup
// @route   PUT /api/donations/:id/pickup/dispatch
// @access  Private (HOSPITAL_ADMIN, ADMIN)
export const dispatchPickup = async (req, res) => {
    try {
        const donation = await Donation.findById(req.params.id);
        if (!donation) return res.status(404).json({ message: 'Donation not found' });

        const BloodRequest = (await import('../models/BloodRequest.js')).default;
        const request = await BloodRequest.findById(donation.requestId);
        const Hospital = (await import('../models/Hospital.js')).default;
        const hospital = await Hospital.findById(request.hospitalId);

        if (req.user.role === 'HOSPITAL_ADMIN' && hospital.adminId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Unauthorized.' });
        }

        if (donation.transportMode !== 'HOSPITAL_PICKUP' || donation.pickupStatus !== 'ACCEPTED') {
            return res.status(400).json({ message: 'Cannot dispatch. Pickup must be ACCEPTED first.' });
        }

        donation.pickupStatus = 'DISPATCHED';
        await donation.save();

        // Notify Donor
        await sendNotification({
            recipientId: donation.donorId,
            type: 'PICKUP_DISPATCHED',
            title: 'Hospital Transport Dispatched',
            message: `Hospital transport has been dispatched to your location.`,
            relatedRequestId: request._id,
            relatedDonationId: donation._id
        });

        res.json(donation);
    } catch (error) {
        console.error('Error dispatching pickup:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Mark Donor Arrived
// @route   PUT /api/donations/:id/arrived
// @access  Private (HOSPITAL_ADMIN, ADMIN)
export const markDonorArrived = async (req, res) => {
    try {
        const donation = await Donation.findById(req.params.id);
        if (!donation) return res.status(404).json({ message: 'Donation not found' });

        const BloodRequest = (await import('../models/BloodRequest.js')).default;
        const request = await BloodRequest.findById(donation.requestId);
        const Hospital = (await import('../models/Hospital.js')).default;
        const hospital = await Hospital.findById(request.hospitalId);

        if (req.user.role === 'HOSPITAL_ADMIN' && hospital.adminId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Unauthorized.' });
        }

        if (donation.status !== 'ACCEPTED') {
            return res.status(400).json({ message: 'Donation must be in ACCEPTED state.' });
        }

        if (donation.transportMode === 'HOSPITAL_PICKUP' && !['DISPATCHED', 'ACCEPTED'].includes(donation.pickupStatus)) {
            return res.status(400).json({ message: 'Cannot mark arrived for this pickup status.' });
        }

        donation.pickupStatus = 'ARRIVED';
        await donation.save();

        // Notify Donor
        await sendNotification({
            recipientId: donation.donorId,
            type: 'DONOR_ARRIVED',
            title: 'Arrival Confirmed',
            message: `The hospital has confirmed your arrival. Thank you for being here!`,
            relatedRequestId: request._id,
            relatedDonationId: donation._id
        });

        res.json(donation);
    } catch (error) {
        console.error('Error marking donor arrived:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get chat messages for a donation
// @route   GET /api/donations/:id/messages
// @access  Private (Donor or Hospital Admin)
export const getDonationMessages = async (req, res) => {
    try {
        const donationId = req.params.id;
        const donation = await Donation.findById(donationId).populate('requestId');
        
        if (!donation) {
            return res.status(404).json({ message: 'Donation not found' });
        }

        // Authorization Checks
        if (donation.status !== 'ACCEPTED' && donation.status !== 'COMPLETED' && donation.status !== 'ARRIVED') {
            return res.status(400).json({ message: 'Chat is not available for this donation state' });
        }

        const Hospital = (await import('../models/Hospital.js')).default;
        const hospital = await Hospital.findById(donation.requestId.hospitalId);
        
        const isDonor = req.user.role === 'DONOR' && donation.donorId.toString() === req.user._id.toString();
        const isHospitalAdmin = req.user.role === 'HOSPITAL_ADMIN' && hospital && hospital.adminId.toString() === req.user._id.toString();

        if (!isDonor && !isHospitalAdmin) {
            return res.status(403).json({ message: 'Not authorized to access this chat' });
        }

        const Message = (await import('../models/Message.js')).default;
        const messages = await Message.find({ donationId })
            .sort({ createdAt: 1 })
            .populate('senderId', 'firstName lastName role');

        res.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Send a chat message for a donation (REST Fallback)
// @route   POST /api/donations/:id/messages
// @access  Private (Donor or Hospital Admin)
export const sendDonationMessage = async (req, res) => {
    try {
        const { text } = req.body;
        if (!text || text.trim() === '') {
            return res.status(400).json({ message: 'Message text is required' });
        }

        const donationId = req.params.id;
        const donation = await Donation.findById(donationId).populate('requestId');
        
        if (!donation) {
            return res.status(404).json({ message: 'Donation not found' });
        }

        // Authorization Checks
        if (donation.status !== 'ACCEPTED' && donation.status !== 'ARRIVED') {
            return res.status(400).json({ message: 'Chat is closed for this donation' });
        }

        const Hospital = (await import('../models/Hospital.js')).default;
        const hospital = await Hospital.findById(donation.requestId.hospitalId);
        
        const isDonor = req.user.role === 'DONOR' && donation.donorId.toString() === req.user._id.toString();
        const isHospitalAdmin = req.user.role === 'HOSPITAL_ADMIN' && hospital && hospital.adminId.toString() === req.user._id.toString();

        if (!isDonor && !isHospitalAdmin) {
            return res.status(403).json({ message: 'Not authorized to access this chat' });
        }

        const Message = (await import('../models/Message.js')).default;
        const newMessage = await Message.create({
            donationId,
            senderId: req.user._id,
            text: text.trim()
        });

        const populatedMessage = await Message.findById(newMessage._id).populate('senderId', 'firstName lastName role');

        // Emit through Socket.IO
        const { getIo } = await import('../socket.js');
        const io = getIo();
        io.to(`donation:${donationId}`).emit('new_message', populatedMessage);

        res.status(201).json(populatedMessage);
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
