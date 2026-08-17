import mongoose from 'mongoose';

const donationSchema = new mongoose.Schema({
    requestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BloodRequest',
        required: true
    },
    donorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    requesterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['REQUESTED', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'CANCELLED'],
        default: 'REQUESTED'
    },
    unitsDonated: {
        type: Number,
        default: 1,
        min: 1
    },
    transportMode: {
        type: String,
        enum: ['NONE', 'SELF', 'HOSPITAL_PICKUP'],
        default: 'NONE'
    },
    pickupStatus: {
        type: String,
        enum: ['NONE', 'REQUESTED', 'ACCEPTED', 'REJECTED', 'DISPATCHED', 'CANCELLED', 'ARRIVED'],
        default: 'NONE'
    },
    requestedAt: {
        type: Date,
        default: Date.now
    },
    acceptedAt: {
        type: Date
    },
    completedAt: {
        type: Date
    }
}, { timestamps: true });

// Prevent duplicate active invitations
// A donor can only have one non-rejected/non-cancelled invite for a specific request at a time
donationSchema.index({ requestId: 1, donorId: 1 }, { unique: true, partialFilterExpression: { status: { $in: ['REQUESTED', 'ACCEPTED'] } } });

const Donation = mongoose.model('Donation', donationSchema);
export default Donation;
