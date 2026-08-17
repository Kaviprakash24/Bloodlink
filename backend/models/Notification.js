import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
    recipientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: [
            'NEW_DONATION_REQUEST',
            'DONATION_ACCEPTED',
            'DONATION_REJECTED',
            'DONATION_COMPLETED',
            'REQUEST_CANCELLED',
            'REQUEST_FULFILLED',
            'HOSPITAL_VERIFIED',
            'HOSPITAL_REJECTED',
            'HOSPITAL_SUSPENDED',
            'PICKUP_REQUESTED',
            'PICKUP_ACCEPTED',
            'PICKUP_REJECTED',
            'PICKUP_DISPATCHED',
            'PICKUP_CANCELLED',
            'DONOR_ARRIVED'
        ],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    relatedRequestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BloodRequest'
    },
    relatedDonationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Donation'
    },
    isRead: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Indexes for fast fetching of user's feed and unread count
notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, isRead: 1 });

// Composite index to enforce idempotency (prevent duplicates)
// A recipient should only get one notification of a specific type for a specific donation or request event.
notificationSchema.index({ recipientId: 1, type: 1, relatedDonationId: 1, relatedRequestId: 1 }, { unique: true });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
