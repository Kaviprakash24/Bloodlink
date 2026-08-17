import DonorProfile from '../models/DonorProfile.js';
import { getCompatibleDonorsFor } from './compatibilityService.js';

/**
 * Finds matching donors for a given blood request.
 * Phase 1 MVP: Filters by compatibility, availability, and a fixed radius.
 * 
 * @param {Object} request - The BloodRequest document
 * @param {Number} maxDistanceMeters - Max search radius (default 10km)
 * @returns {Array} - Array of matched donor profiles, sorted by distance
 */
export const findMatchesForRequest = async (request) => {
    try {
        const { getCompatibleDonorsFor } = await import('./compatibilityService.js');
        const compatibleBloodGroups = getCompatibleDonorsFor(request.bloodGroupRequired);
        
        const cooldownDays = parseInt(process.env.DONATION_INTERVAL_DAYS) || 56;
        const cooldownDate = new Date();
        cooldownDate.setDate(cooldownDate.getDate() - cooldownDays);
        
        let maxDistanceMeters = 25000; // NORMAL: 25km
        if (request.urgency === 'URGENT') maxDistanceMeters = 50000; // 50km
        if (request.urgency === 'CRITICAL') maxDistanceMeters = 100000; // 100km

        let hasLocation = request.location && request.location.coordinates && request.location.coordinates.length === 2 && request.location.coordinates[0] !== 0;

        const commonPipelineEnd = [
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            {
                $project: {
                    'user.passwordHash': 0,
                    'user.role': 0,
                    'location': 0 // NEVER expose donor's exact coordinates to requester
                }
            }
        ];

        let matchedDonors = [];
        let fetchedIds = new Set();

        // Stage 1: Geospatial Search (if request has location)
        if (hasLocation) {
            const [longitude, latitude] = request.location.coordinates;
            let geoPipeline = [
                {
                    $geoNear: {
                        near: {
                            type: 'Point',
                            coordinates: [longitude, latitude]
                        },
                        distanceField: 'calculatedDistance',
                        maxDistance: maxDistanceMeters,
                        spherical: true
                    }
                },
                {
                    $match: {
                        isAvailable: true,
                        bloodGroup: { $in: compatibleBloodGroups },
                        $or: [
                            { lastDonationDate: { $exists: false } },
                            { lastDonationDate: null },
                            { lastDonationDate: { $lte: cooldownDate } }
                        ]
                    }
                },
                { $limit: 100 },
                ...commonPipelineEnd
            ];
            
            matchedDonors = await DonorProfile.aggregate(geoPipeline);
            matchedDonors.forEach(d => fetchedIds.add(d._id.toString()));
        }

        // Stage 2: City Fallback (if no location, or not enough donors found)
        const targetDonorCount = (request.unitsRequired || 1) * 3;
        if (!hasLocation || matchedDonors.length < targetDonorCount) {
            const mongoose = (await import('mongoose')).default;
            let cityPipeline = [
                {
                    $match: {
                        _id: { $nin: Array.from(fetchedIds).map(id => new mongoose.Types.ObjectId(id)) },
                        isAvailable: true,
                        bloodGroup: { $in: compatibleBloodGroups },
                        city: request.city,
                        $or: [
                            { lastDonationDate: { $exists: false } },
                            { lastDonationDate: null },
                            { lastDonationDate: { $lte: cooldownDate } }
                        ]
                    }
                },
                {
                    $addFields: { calculatedDistance: null } // Explicitly mark distance as unknown
                },
                { $limit: 100 },
                ...commonPipelineEnd
            ];

            const fallbackDonors = await DonorProfile.aggregate(cityPipeline);
            matchedDonors = [...matchedDonors, ...fallbackDonors];
        }

        // Stage 3: Scoring & Ranking in JavaScript
        const scoredDonors = matchedDonors.map(donor => {
            let score = 0;
            const tags = [];

            // A. Blood Group (Max 30)
            if (donor.bloodGroup === request.bloodGroupRequired) {
                score += 30;
                tags.push(`Exact Match (${donor.bloodGroup})`);
            } else {
                score += 15;
                tags.push(`Compatible (${donor.bloodGroup})`);
            }

            // B. Distance (Max 40)
            if (donor.calculatedDistance !== null && donor.calculatedDistance !== undefined) {
                const km = donor.calculatedDistance / 1000;
                if (km <= 5) {
                    score += 40;
                    tags.push('Very Close (<5km)');
                } else if (km <= 15) {
                    score += 30;
                    tags.push('Close (5-15km)');
                } else if (km <= 30) {
                    score += 20;
                    tags.push('Nearby (15-30km)');
                } else if (km <= 50) {
                    score += 10;
                    tags.push('Regional (30-50km)');
                } else {
                    score += 5;
                    tags.push('Far (>50km)');
                }
            } else {
                score += 15;
                tags.push('Same City (Approx)');
            }

            // C. Location Precision (Max 15)
            if (donor.isExactLocation === true) {
                score += 15;
                tags.push('Precise GPS');
            } else if (donor.isExactLocation === false && donor.calculatedDistance !== null) {
                score += 10;
                // Don't clutter UI with 'Geocoded', maybe just don't add a tag for approx.
            } else {
                score += 0;
            }

            // D. Verified Donation History (Max 15)
            const count = donor.donationCount || 0;
            if (count >= 5) {
                score += 15;
                tags.push('Hero Donor');
            } else if (count >= 2) {
                score += 10;
                tags.push('Frequent Donor');
            } else if (count === 1) {
                score += 5;
                tags.push('Verified Donor');
            } else {
                score += 0;
            }

            // Strip private exact location data
            const safeDonor = { ...donor };
            if (safeDonor.location) {
                delete safeDonor.location.coordinates;
            }

            return {
                ...safeDonor,
                matchScore: score,
                matchTags: tags
            };
        });

        // Sort by matchScore descending, then by distance ascending
        scoredDonors.sort((a, b) => {
            if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
            // Handle null distances by putting them last in tie-breakers
            const distA = a.calculatedDistance ?? Infinity;
            const distB = b.calculatedDistance ?? Infinity;
            return distA - distB;
        });

        return scoredDonors;
    } catch (error) {
        console.error('Error in matching service:', error);
        throw error;
    }
};

/**
 * Finds open blood requests for a given donor.
 * 
 * @param {Object} donorProfile - The DonorProfile document
 * @param {Number} maxDistanceMeters - Max search radius (default 10km)
 * @returns {Array} - Array of matched blood requests, sorted by distance
 */
export const findRequestsForDonor = async (donorProfile, maxDistanceMeters = 10000) => {
    try {
        const { getCompatibleRecipientsFor } = await import('./compatibilityService.js');
        const BloodRequest = (await import('../models/BloodRequest.js')).default;
        
        const compatibleBloodGroups = getCompatibleRecipientsFor(donorProfile.bloodGroup);
        
        let pipeline = [];
        let hasLocation = donorProfile.location && donorProfile.location.coordinates && donorProfile.location.coordinates.length === 2;

        if (hasLocation) {
            const [longitude, latitude] = donorProfile.location.coordinates;
            pipeline.push({
                $geoNear: {
                    near: {
                        type: 'Point',
                        coordinates: [longitude, latitude]
                    },
                    distanceField: 'calculatedDistance',
                    maxDistance: maxDistanceMeters,
                    spherical: true
                }
            });
            pipeline.push({
                $match: {
                    status: { $in: ['OPEN', 'PARTIALLY_FULFILLED'] },
                    requiredBy: { $gt: new Date() },
                    bloodGroupRequired: { $in: compatibleBloodGroups }
                }
            });
        } else {
            pipeline.push({
                $match: {
                    status: { $in: ['OPEN', 'PARTIALLY_FULFILLED'] },
                    requiredBy: { $gt: new Date() },
                    bloodGroupRequired: { $in: compatibleBloodGroups },
                    city: donorProfile.city
                }
            });
            pipeline.push({
                $addFields: { calculatedDistance: null }
            });
        }

        pipeline.push(
            {
                $lookup: {
                    from: 'hospitals',
                    localField: 'hospitalId',
                    foreignField: '_id',
                    as: 'hospital'
                }
            },
            {
                $unwind: {
                    path: '$hospital',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $sort: hasLocation 
                    ? { urgency: -1, calculatedDistance: 1 } 
                    : { urgency: -1 }
            },
            {
                $project: {
                    patientName: 0,
                    'hospital.adminId': 0,
                    'location': 0, // Do not expose exact request location to donor
                    'hospital.location': 0 // Do not expose exact hospital location to donor
                }
            }
        );

        const requests = await BloodRequest.aggregate(pipeline);

        return requests;
    } catch (error) {
        console.error('Error finding requests for donor:', error);
        throw error;
    }
};
