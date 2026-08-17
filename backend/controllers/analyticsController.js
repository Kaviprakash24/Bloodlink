import User from '../models/User.js';
import DonorProfile from '../models/DonorProfile.js';
import Hospital from '../models/Hospital.js';
import BloodRequest from '../models/BloodRequest.js';
import Donation from '../models/Donation.js';

// Helper to build date match
const buildDateMatch = (req, dateField) => {
    const { startDate, endDate } = req.query;
    if (!startDate && !endDate) return {};
    
    const match = {};
    if (startDate || endDate) {
        match[dateField] = {};
        if (startDate) match[dateField].$gte = new Date(startDate);
        if (endDate) match[dateField].$lte = new Date(endDate);
    }
    return match;
};

// @desc    Get high-level overview metrics
// @route   GET /api/admin/analytics/overview
// @access  Private (ADMIN)
export const getOverview = async (req, res) => {
    try {
        const dateMatch = buildDateMatch(req, 'createdAt');
        
        // Concurrent counts for fast execution
        const [
            userRoles,
            activeDonors,
            hospitalsStatus,
            requestMetrics
        ] = await Promise.all([
            User.aggregate([
                { $match: dateMatch },
                { $group: { _id: '$role', count: { $sum: 1 } } }
            ]),
            DonorProfile.countDocuments({ isAvailable: true }),
            Hospital.aggregate([
                { $match: dateMatch },
                { $group: { _id: '$verificationStatus', count: { $sum: 1 } } }
            ]),
            BloodRequest.aggregate([
                { $match: dateMatch },
                { $group: { 
                    _id: null,
                    totalRequests: { $sum: 1 },
                    urgentRequests: { $sum: { $cond: [{ $eq: ['$urgency', 'URGENT'] }, 1, 0] } },
                    criticalRequests: { $sum: { $cond: [{ $eq: ['$urgency', 'CRITICAL'] }, 1, 0] } },
                    totalUnitsRequested: { $sum: '$unitsRequired' },
                    totalUnitsFulfilled: { $sum: '$unitsFulfilled' }
                }}
            ])
        ]);

        const completedDonations = await Donation.countDocuments({ status: 'COMPLETED', ...buildDateMatch(req, 'completedAt') });

        // Formatting results
        const usersByRole = userRoles.reduce((acc, curr) => {
            acc[curr._id] = curr.count;
            return acc;
        }, { DONOR: 0, REQUESTER: 0, HOSPITAL_ADMIN: 0, ADMIN: 0 });

        const hospitalsByStatus = hospitalsStatus.reduce((acc, curr) => {
            acc[curr._id] = curr.count;
            return acc;
        }, { PENDING: 0, VERIFIED: 0, REJECTED: 0, SUSPENDED: 0 });

        const reqMetrics = requestMetrics[0] || {
            totalRequests: 0,
            urgentRequests: 0,
            criticalRequests: 0,
            totalUnitsRequested: 0,
            totalUnitsFulfilled: 0
        };

        const overallFulfillmentRate = reqMetrics.totalUnitsRequested > 0 
            ? ((reqMetrics.totalUnitsFulfilled / reqMetrics.totalUnitsRequested) * 100).toFixed(2)
            : 0;

        res.json({
            totalUsers: Object.values(usersByRole).reduce((a, b) => a + b, 0),
            totalDonors: usersByRole.DONOR,
            activeDonors,
            totalRequesters: usersByRole.REQUESTER,
            totalHospitals: Object.values(hospitalsByStatus).reduce((a, b) => a + b, 0),
            pendingHospitals: hospitalsByStatus.PENDING,
            verifiedHospitals: hospitalsByStatus.VERIFIED,
            openRequests: await BloodRequest.countDocuments({ status: 'OPEN', ...dateMatch }),
            urgentRequests: reqMetrics.urgentRequests,
            criticalRequests: reqMetrics.criticalRequests,
            completedDonations,
            totalUnitsRequested: reqMetrics.totalUnitsRequested,
            totalUnitsFulfilled: reqMetrics.totalUnitsFulfilled,
            overallFulfillmentRate: parseFloat(overallFulfillmentRate)
        });
    } catch (error) {
        console.error('Error fetching overview analytics:', error);
        res.status(500).json({ message: 'Server error fetching overview analytics' });
    }
};

// @desc    Get blood group demand
// @route   GET /api/admin/analytics/blood-groups
// @access  Private (ADMIN)
export const getBloodGroupDemand = async (req, res) => {
    try {
        const dateMatch = buildDateMatch(req, 'createdAt');
        const demand = await BloodRequest.aggregate([
            { $match: dateMatch },
            { $group: {
                _id: '$bloodGroupRequired',
                requests: { $sum: 1 },
                unitsRequested: { $sum: '$unitsRequired' },
                unitsFulfilled: { $sum: '$unitsFulfilled' }
            }},
            { $project: {
                bloodGroup: '$_id',
                requests: 1,
                unitsRequested: 1,
                unitsFulfilled: 1,
                fulfillmentRate: {
                    $cond: [
                        { $gt: ['$unitsRequested', 0] },
                        { $round: [{ $multiply: [{ $divide: ['$unitsFulfilled', '$unitsRequested'] }, 100] }, 2] },
                        0
                    ]
                },
                _id: 0
            }},
            { $sort: { requests: -1 } }
        ]);
        
        res.json(demand);
    } catch (error) {
        console.error('Error fetching blood group demand:', error);
        res.status(500).json({ message: 'Server error fetching blood group demand' });
    }
};

// @desc    Get request status breakdown
// @route   GET /api/admin/analytics/status
// @access  Private (ADMIN)
export const getRequestStatus = async (req, res) => {
    try {
        const dateMatch = buildDateMatch(req, 'createdAt');
        const now = new Date();
        
        const statusCounts = await BloodRequest.aggregate([
            { $match: dateMatch },
            {
                $addFields: {
                    // Handle lazy expiration
                    computedStatus: {
                        $cond: {
                            if: { 
                                $and: [
                                    { $in: ['$status', ['OPEN', 'MATCHING', 'PARTIALLY_FULFILLED']] },
                                    { $lt: ['$requiredBy', now] }
                                ]
                            },
                            then: 'EXPIRED',
                            else: '$status'
                        }
                    }
                }
            },
            { $group: {
                _id: '$computedStatus',
                count: { $sum: 1 }
            }},
            { $project: {
                status: '$_id',
                count: 1,
                _id: 0
            }},
            { $sort: { count: -1 } }
        ]);

        res.json(statusCounts);
    } catch (error) {
        console.error('Error fetching request status analytics:', error);
        res.status(500).json({ message: 'Server error fetching request status analytics' });
    }
};

// @desc    Get operational performance metrics
// @route   GET /api/admin/analytics/performance
// @access  Private (ADMIN)
export const getPerformanceMetrics = async (req, res) => {
    try {
        const dateMatchDonation = buildDateMatch(req, 'createdAt');
        const dateMatchRequest = buildDateMatch(req, 'createdAt');
        
        const performance = await Donation.aggregate([
            { $match: { ...dateMatchDonation, acceptedAt: { $ne: null } } },
            { $group: {
                _id: null,
                avgRequestToAcceptanceSeconds: { 
                    $avg: { 
                        $divide: [{ $subtract: ['$acceptedAt', '$createdAt'] }, 1000] 
                    } 
                },
                avgAcceptanceToCompletionSeconds: {
                    $avg: {
                        $cond: [
                            { $ne: ['$completedAt', null] },
                            { $divide: [{ $subtract: ['$completedAt', '$acceptedAt'] }, 1000] },
                            null
                        ]
                    }
                }
            }}
        ]);

        const requests = await BloodRequest.aggregate([
            { $match: dateMatchRequest },
            {
                $addFields: {
                    isExpired: {
                        $cond: [
                            { 
                                $and: [
                                    { $in: ['$status', ['OPEN', 'MATCHING', 'PARTIALLY_FULFILLED']] },
                                    { $lt: ['$requiredBy', new Date()] }
                                ]
                            },
                            true,
                            false
                        ]
                    }
                }
            },
            { $group: {
                _id: null,
                total: { $sum: 1 },
                cancelled: { $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] } },
                expired: { $sum: { $cond: [{ $eq: ['$isExpired', true] }, 1, 0] } }
            }}
        ]);

        const perfData = performance[0] || {};
        const reqData = requests[0] || { total: 0, cancelled: 0, expired: 0 };

        res.json({
            avgRequestToAcceptanceMinutes: perfData.avgRequestToAcceptanceSeconds ? (perfData.avgRequestToAcceptanceSeconds / 60).toFixed(2) : null,
            avgAcceptanceToCompletionMinutes: perfData.avgAcceptanceToCompletionSeconds ? (perfData.avgAcceptanceToCompletionSeconds / 60).toFixed(2) : null,
            cancellationRate: reqData.total > 0 ? ((reqData.cancelled / reqData.total) * 100).toFixed(2) : 0,
            expirationRate: reqData.total > 0 ? ((reqData.expired / reqData.total) * 100).toFixed(2) : 0
        });
    } catch (error) {
        console.error('Error fetching performance metrics:', error);
        res.status(500).json({ message: 'Server error fetching performance metrics' });
    }
};

// @desc    Get location insights
// @route   GET /api/admin/analytics/locations
// @access  Private (ADMIN)
export const getLocationInsights = async (req, res) => {
    try {
        const dateMatch = buildDateMatch(req, 'createdAt');
        
        const locations = await BloodRequest.aggregate([
            { $match: dateMatch },
            { $group: {
                _id: '$city',
                requests: { $sum: 1 },
                unitsRequested: { $sum: '$unitsRequired' }
            }},
            { $project: {
                city: '$_id',
                requests: 1,
                unitsRequested: 1,
                _id: 0
            }},
            { $sort: { requests: -1 } },
            { $limit: 20 }
        ]);

        res.json(locations);
    } catch (error) {
        console.error('Error fetching location insights:', error);
        res.status(500).json({ message: 'Server error fetching location insights' });
    }
};

// @desc    Get time trends
// @route   GET /api/admin/analytics/trends
// @access  Private (ADMIN)
export const getTimeTrends = async (req, res) => {
    try {
        const dateMatch = buildDateMatch(req, 'createdAt');
        
        // Group requests by date
        const requestTrends = await BloodRequest.aggregate([
            { $match: dateMatch },
            { $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                totalRequests: { $sum: 1 },
                urgentCriticalRequests: { 
                    $sum: { $cond: [{ $in: ['$urgency', ['URGENT', 'CRITICAL']] }, 1, 0] } 
                }
            }},
            { $sort: { _id: 1 } }
        ]);

        // Group completed donations by date
        const donationTrends = await Donation.aggregate([
            { $match: { status: 'COMPLETED', ...buildDateMatch(req, 'completedAt') } },
            { $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$completedAt" } },
                completedDonations: { $sum: 1 }
            }},
            { $sort: { _id: 1 } }
        ]);

        // Merge the two arrays by date
        const trendsMap = new Map();
        
        requestTrends.forEach(rt => {
            trendsMap.set(rt._id, {
                date: rt._id,
                totalRequests: rt.totalRequests,
                urgentCriticalRequests: rt.urgentCriticalRequests,
                completedDonations: 0
            });
        });

        donationTrends.forEach(dt => {
            if (trendsMap.has(dt._id)) {
                trendsMap.get(dt._id).completedDonations = dt.completedDonations;
            } else {
                trendsMap.set(dt._id, {
                    date: dt._id,
                    totalRequests: 0,
                    urgentCriticalRequests: 0,
                    completedDonations: dt.completedDonations
                });
            }
        });

        const sortedTrends = Array.from(trendsMap.values()).sort((a, b) => a.date.localeCompare(b.date));

        res.json(sortedTrends);
    } catch (error) {
        console.error('Error fetching time trends:', error);
        res.status(500).json({ message: 'Server error fetching time trends' });
    }
};
