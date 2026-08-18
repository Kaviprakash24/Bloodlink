import Hospital from '../models/Hospital.js';
import { geocodeAddress } from '../services/geocodingService.js';

// @desc    Get all verified hospitals
// @route   GET /api/hospitals
// @access  Private (Requester / Admin)
export const getHospitals = async (req, res) => {
    try {
        const hospitals = await Hospital.find({
            verificationStatus: 'VERIFIED'
        })
            .select('name city postalCode location isExactLocation')
            .sort({ name: 1 });

        console.log(`Found ${hospitals.length} verified hospitals`);

        res.json(hospitals);
    } catch (error) {
        console.error('Error fetching hospitals:', error);
        res.status(500).json({
            message: 'Server error fetching hospitals'
        });
    }
};

// @desc    Create a new hospital
// @route   POST /api/hospitals
// @access  Private (Admin)
export const createHospital = async (req, res) => {
    try {
        const { name, city, postalCode, longitude, latitude } = req.body;
        
        let location = undefined;
        let isExactLocation = false;

        if (longitude && latitude) {
            location = {
                type: 'Point',
                coordinates: [parseFloat(longitude), parseFloat(latitude)]
            };
            isExactLocation = true;
        } else {
            // Geocode using City + Postal Code
            const coords = await geocodeAddress(city, postalCode);
            if (coords) {
                location = {
                    type: 'Point',
                    coordinates: [coords.longitude, coords.latitude]
                };
                isExactLocation = false;
            }
        }

        const hospitalData = {
            adminId: req.user._id, // Assume current user is admin creating it
            name,
            city,
            postalCode,
            isExactLocation
        };

        if (location) {
            hospitalData.location = location;
        }

        const hospital = await Hospital.create(hospitalData);
        res.status(201).json(hospital);
    } catch (error) {
        console.error('Error creating hospital:', error);
        res.status(500).json({ message: 'Server error creating hospital' });
    }
};
