import Notification from '../models/Notification.js';
import { getIo } from '../socket.js';

/**
 * Helper to safely create a notification while preventing duplicates
 * based on recipient, type, and the related context.
 */
const createUniqueNotification = async (data) => {
    try {
        // Idempotency check: don't create if one already exists for this exact event
        const query = {
            recipientId: data.recipientId,
            type: data.type
        };
        if (data.relatedDonationId) query.relatedDonationId = data.relatedDonationId;
        if (data.relatedRequestId) query.relatedRequestId = data.relatedRequestId;

        const existing = await Notification.findOne(query);
        if (existing) {
            return existing; // Already notified
        }

        const notification = await Notification.create(data);

        // Real-Time Delivery
        try {
            const io = getIo();
            io.to(`user:${notification.recipientId.toString()}`).emit('new_notification', notification);
        } catch (socketError) {
            // Socket not initialized or other error, but we shouldn't fail the REST API
            console.error('Socket Delivery Error:', socketError.message);
        }

        return notification;
    } catch (error) {
        if (error.code === 11000) {
            // Race condition caught by unique index, ignore
            return;
        }
        console.error('Notification creation error:', error);
    }
};

export const notifyNewDonationRequest = async (donorId, request, distanceText) => {
    const title = 'New Blood Donation Request';
    let message = `URGENT: ${request.bloodGroupRequired} blood needed at a hospital in ${request.city}.`;
    if (distanceText) {
        message = `URGENT: ${request.bloodGroupRequired} blood needed approximately ${distanceText} away.`;
    }

    return createUniqueNotification({
        recipientId: donorId,
        type: 'NEW_DONATION_REQUEST',
        title,
        message,
        relatedRequestId: request._id
    });
};

export const notifyDonationAccepted = async (requesterId, donationId, requestId) => {
    return createUniqueNotification({
        recipientId: requesterId,
        type: 'DONATION_ACCEPTED',
        title: 'Donor Accepted Your Request',
        message: 'A donor has accepted your blood donation request and is preparing to donate.',
        relatedDonationId: donationId,
        relatedRequestId: requestId
    });
};

export const notifyDonationRejected = async (requesterId, donationId, requestId) => {
    return createUniqueNotification({
        recipientId: requesterId,
        type: 'DONATION_REJECTED',
        title: 'Donor Declined Your Request',
        message: 'A donor was unable to accept your blood donation request.',
        relatedDonationId: donationId,
        relatedRequestId: requestId
    });
};

export const notifyDonationCompleted = async (requesterId, donationId, requestId) => {
    return createUniqueNotification({
        recipientId: requesterId,
        type: 'DONATION_COMPLETED',
        title: 'Donation Completed',
        message: 'A donor has successfully completed their donation for your request.',
        relatedDonationId: donationId,
        relatedRequestId: requestId
    });
};

export const notifyHospitalVerification = async (hospitalAdminId, status) => {
    let title = '';
    let message = '';
    let type = '';

    if (status === 'VERIFIED') {
        type = 'HOSPITAL_VERIFIED';
        title = 'Hospital Verified';
        message = 'Your hospital registration has been approved. You can now manage blood requests.';
    } else if (status === 'REJECTED') {
        type = 'HOSPITAL_REJECTED';
        title = 'Hospital Rejected';
        message = 'Your hospital registration has been rejected. Please contact support.';
    } else if (status === 'SUSPENDED') {
        type = 'HOSPITAL_SUSPENDED';
        title = 'Hospital Suspended';
        message = 'Your hospital account has been suspended. Operational access is disabled.';
    } else {
        return;
    }

    return createUniqueNotification({
        recipientId: hospitalAdminId,
        type,
        title,
        message
    });
};

export const notifyRequestFulfilled = async (requesterId, requestId) => {
    return createUniqueNotification({
        recipientId: requesterId,
        type: 'REQUEST_FULFILLED',
        title: 'Blood Request Fulfilled',
        message: 'Your blood request has met its required units and is now completely fulfilled.',
        relatedRequestId: requestId
    });
};

export const notifyRequestCancelled = async (donorId, requestId) => {
    return createUniqueNotification({
        recipientId: donorId,
        type: 'REQUEST_CANCELLED',
        title: 'Blood Request Cancelled',
        message: 'The blood request you were invited to has been cancelled by the requester.',
        relatedRequestId: requestId
    });
};

export const sendNotification = createUniqueNotification;
