import mongoose from 'mongoose';

const hospitalSchema = new mongoose.Schema({
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    contactNumber: {
        type: String,
        trim: true
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
        default: false // True if precise coordinates provided, false if geocoded from City/PIN
    },
    verificationStatus: {
        type: String,
        enum: ['PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED'],
        default: 'PENDING'
    }
}, { timestamps: true });

// Index for geospatial queries if we ever want to find nearby hospitals
hospitalSchema.index({ location: '2dsphere' });

const Hospital = mongoose.model('Hospital', hospitalSchema);
export default Hospital;
