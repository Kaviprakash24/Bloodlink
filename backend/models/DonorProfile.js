import mongoose from 'mongoose';

const donorProfileSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    bloodGroup: {
        type: String,
        enum: ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
        required: true
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
    isExactLocation: {
        type: Boolean,
        required: true,
        default: false // True if from browser geolocation, false if geocoded from PIN/City
    },
    isAvailable: {
        type: Boolean,
        default: true
    },
    lastDonationDate: {
        type: Date
        // Note: Used as a soft filter; final eligibility requires medical confirmation
    },
    donationCount: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// Important: 2dsphere index for geospatial queries (nearby donors)
donorProfileSchema.index({ location: '2dsphere' });
// Index for fast filtering by blood group and availability
donorProfileSchema.index({ bloodGroup: 1, isAvailable: 1 });

const DonorProfile = mongoose.model('DonorProfile', donorProfileSchema);
export default DonorProfile;
