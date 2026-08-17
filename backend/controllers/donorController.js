import DonorProfile from '../models/DonorProfile.js';
import { geocodeAddress } from '../services/geocodingService.js';

// @desc    Update donor profile (City/PIN/Geolocation flow)
// @route   PUT /api/donors/profile
// @access  Private (Donor only)
export const updateDonorProfile = async (req, res) => {
    try {
        const { bloodGroup, city, postalCode, longitude, latitude, isExactLocation, isAvailable } = req.body;

        // Validation
        if (!bloodGroup || !city || !postalCode) {
            return res.status(400).json({ message: 'Blood group, city, and postal code are required' });
        }

        // Handle Location Setup
        let location = undefined;
        let locationType = false; // isExactLocation

        if (longitude && latitude) {
            location = {
                type: 'Point',
                coordinates: [parseFloat(longitude), parseFloat(latitude)]
            };
            locationType = isExactLocation !== undefined ? isExactLocation : true;
        } else {
            // Geocoding Fallback
            const coords = await geocodeAddress(city, postalCode);
            if (coords) {
                location = {
                    type: 'Point',
                    coordinates: [coords.longitude, coords.latitude]
                };
                locationType = false; // It's approximate
            }
        }

        const profileData = {
            userId: req.user._id,
            bloodGroup,
            city,
            postalCode,
            isExactLocation: locationType,
            isAvailable: isAvailable !== undefined ? isAvailable : true
        };
        
        const updateDoc = { $set: profileData };
        if (location) {
            updateDoc.$set.location = location;
        } else {
            updateDoc.$unset = { location: "" };
        }

        // Upsert (Update if exists, insert if new)
        const profile = await DonorProfile.findOneAndUpdate(
            { userId: req.user._id },
            updateDoc,
            { returnDocument: 'after', upsert: true, runValidators: true }
        );

        res.json(profile);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error updating profile' });
    }
};

// @desc    Get current donor's profile
// @route   GET /api/donors/profile
// @access  Private (Donor only)
export const getDonorProfile = async (req, res) => {
    try {
        const profile = await DonorProfile.findOne({ userId: req.user._id });
        
        if (!profile) {
            return res.status(404).json({ message: 'Donor profile not found' });
        }
        
        res.json(profile);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching profile' });
    }
};
