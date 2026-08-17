import mongoose from 'mongoose';

const bloodRequestSchema = new mongoose.Schema({
    requesterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    hospitalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hospital',
        required: true
    },
    bloodGroupRequired: {
        type: String,
        enum: ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
        required: true
    },
    unitsRequired: {
        type: Number,
        required: true,
        min: 1
    },
    unitsFulfilled: {
        type: Number,
        default: 0
    },
    patientName: {
        type: String,
        required: true
        // Kept private, not exposed to donors until matched/accepted
    },
    city: {
        type: String,
        required: true,
        trim: true
    },
    postalCode: {
        type: String,
        required: true,
        trim: true
    },
    location: {
        type: {
            type: String,
            enum: ['Point']
        },
        coordinates: {
            type: [Number] // [longitude, latitude]
        }
    },
    urgency: {
        type: String,
        enum: ['NORMAL', 'URGENT', 'CRITICAL'],
        default: 'NORMAL'
    },
    status: {
        type: String,
        enum: ['OPEN', 'MATCHING', 'PARTIALLY_FULFILLED', 'FULFILLED', 'CANCELLED', 'EXPIRED'],
        default: 'OPEN'
    },
    requiredBy: {
        type: Date,
        required: true
    }
}, { timestamps: true });

bloodRequestSchema.index({ location: '2dsphere' });
bloodRequestSchema.index({ status: 1, bloodGroupRequired: 1 });

const BloodRequest = mongoose.model('BloodRequest', bloodRequestSchema);
export default BloodRequest;
