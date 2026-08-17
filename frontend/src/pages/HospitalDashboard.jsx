import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { Card, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import ProgressBar from '../components/ui/ProgressBar';
import ChatBox from '../components/chat/ChatBox';

const HospitalDashboard = () => {
  const { user } = useContext(AuthContext);
  const [requests, setRequests] = useState([]);
  const [donations, setDonations] = useState([]);
  const [myHospital, setMyHospital] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState(null);
  
  // Chat state
  const [openChatId, setOpenChatId] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [reqRes, donRes, hospRes] = await Promise.all([
        api.get('/requests/my-requests'),
        api.get('/donations/my-requests'),
        api.get('/hospitals')
      ]);
      setRequests(reqRes.data);
      setDonations(donRes.data);
      
      // Find my hospital
      const me = hospRes.data.find(h => {
        const adminId = h.adminId?._id || h.adminId;
        return adminId === user._id || adminId === user.id;
      });
      setMyHospital(me);
    } catch (err) {
      console.error(err);
      setError('Failed to load hospital data.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteDonation = async (donationId, unitsDonated = 1) => {
    try {
      setProcessingId(donationId);
      await api.put(`/donations/${donationId}/complete`, { unitsDonated });
      await fetchDashboardData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to complete donation');
    } finally {
      setProcessingId(null);
    }
  };

  const handlePickupResponse = async (donationId, status) => {
    try {
      setProcessingId(donationId);
      await api.put(`/donations/${donationId}/pickup/respond`, { status });
      await fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to respond to pickup request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDispatch = async (donationId) => {
    try {
      setProcessingId(donationId);
      await api.put(`/donations/${donationId}/pickup/dispatch`);
      await fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to dispatch transport');
    } finally {
      setProcessingId(null);
    }
  };

  const handleArrived = async (donationId) => {
    try {
      setProcessingId(donationId);
      await api.put(`/donations/${donationId}/arrived`);
      await fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to mark donor arrived');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const acceptedDonations = donations.filter(d => d.status === 'ACCEPTED');
  const activeRequests = requests.filter(r => ['OPEN', 'ACCEPTED', 'PARTIALLY_FULFILLED'].includes(r.status));
  const criticalRequestsCount = activeRequests.filter(r => r.urgency === 'CRITICAL').length;
  const completedDonationsCount = donations.filter(d => ['COMPLETED', 'FULFILLED'].includes(d.status)).length;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Command Center Header */}
      <div className="bg-slate-900 rounded-xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold mb-1">{myHospital ? myHospital.name : 'Hospital Command Center'}</h1>
            <p className="text-slate-300 text-lg flex items-center gap-2">
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.242-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {myHospital ? myHospital.city : 'Loading location...'}
            </p>
            {myHospital && (
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold bg-slate-800 border border-slate-700">
                {myHospital.verificationStatus === 'VERIFIED' ? (
                  <><span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span> <span className="text-green-400">VERIFIED NETWORK PARTNER</span></>
                ) : myHospital.verificationStatus === 'PENDING' ? (
                  <><span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span> <span className="text-yellow-400">VERIFICATION PENDING</span></>
                ) : (
                  <><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> <span className="text-red-400">ACCOUNT SUSPENDED</span></>
                )}
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap gap-4">
            <div className="bg-slate-800/80 rounded-lg p-4 text-center border border-slate-700 min-w-[110px] backdrop-blur-sm">
              <p className="text-slate-400 text-xs font-bold tracking-wider uppercase mb-1">Active</p>
              <p className="text-3xl font-bold text-white">{activeRequests.length}</p>
            </div>
            <div className="bg-red-900/40 rounded-lg p-4 text-center border border-red-800/50 min-w-[110px] backdrop-blur-sm">
              <p className="text-red-300 text-xs font-bold tracking-wider uppercase mb-1">Critical</p>
              <p className="text-3xl font-bold text-red-400">{criticalRequestsCount}</p>
            </div>
            <div className="bg-slate-800/80 rounded-lg p-4 text-center border border-slate-700 min-w-[110px] backdrop-blur-sm">
              <p className="text-slate-400 text-xs font-bold tracking-wider uppercase mb-1">Donations</p>
              <p className="text-3xl font-bold text-green-400">{completedDonationsCount}</p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {error}
        </div>
      )}

      {/* Verification Banner */}
      {myHospital && myHospital.verificationStatus === 'PENDING' && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-5 rounded-r-lg shadow-sm">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-bold text-yellow-800 uppercase tracking-wide">Verification Pending</h3>
              <div className="mt-1 text-sm text-yellow-700">
                <p>Your hospital account is currently under review by BloodLink administrators. You will not be able to create blood requests until your identity and licenses are verified. This usually takes 1-2 business days.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        <a href="#incoming-donors" className="whitespace-nowrap px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm font-semibold border border-green-100 hover:bg-green-100 transition-colors shadow-sm">Confirm Incoming Donors</a>
        <a href="#active-requests" className="whitespace-nowrap px-4 py-2 bg-slate-100 text-slate-700 rounded-full text-sm font-medium border border-slate-200 hover:bg-slate-200 transition-colors">Manage Requests</a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Incoming Donors */}
        <div className="space-y-4" id="incoming-donors">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-xl font-bold text-slate-900">Incoming Donors</h2>
            <span className="bg-green-100 text-green-800 text-xs font-bold px-2.5 py-0.5 rounded-full">{acceptedDonations.length} Pending Actions</span>
          </div>
          
          {acceptedDonations.length === 0 ? (
            <Card className="bg-slate-50 border-dashed border-2 border-slate-300">
              <CardBody className="text-center py-10">
                <div className="w-16 h-16 mx-auto bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                  <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900">No pending arrivals</h3>
                <p className="text-slate-500 mt-1">Matched donors who accept requests will appear here for you to confirm their donation upon arrival.</p>
              </CardBody>
            </Card>
          ) : (
            acceptedDonations.map(donation => (
              <Card key={donation._id} className="border-green-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
                <div className="bg-green-50 px-4 py-2 border-b border-green-100 flex justify-between items-center">
                  <span className="text-xs font-bold text-green-700 uppercase tracking-wide">Donor En Route</span>
                  <span className="text-xs text-green-600">Accepted: {new Date(donation.acceptedAt).toLocaleTimeString()}</span>
                </div>
                <CardBody className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-lg font-bold text-slate-600 border border-slate-200">
                      {donation.donorId?.firstName?.charAt(0)}{donation.donorId?.lastName?.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        {donation.donorId?.firstName} {donation.donorId?.lastName}
                      </h3>
                      <p className="text-sm font-medium text-slate-600 mt-0.5 flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-bold">{donation.requestId?.bloodGroupRequired}</span>
                        Targeting Request: {donation.requestId?.status}
                      </p>
                    </div>
                  </div>
                  
                  <div className="w-full sm:w-auto mt-4 sm:mt-0 flex flex-col gap-2 items-end">
                    
                    {/* Phase 5.6: Donor Coordination Action Buttons */}
                    {donation.transportMode === 'HOSPITAL_PICKUP' && donation.pickupStatus === 'REQUESTED' && (
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() => handlePickupResponse(donation._id, 'REJECTED')}
                          disabled={processingId === donation._id}
                        >
                          Reject Pickup
                        </Button>
                        <Button 
                          variant="primary" 
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => handlePickupResponse(donation._id, 'ACCEPTED')}
                          disabled={processingId === donation._id}
                        >
                          Approve Pickup
                        </Button>
                      </div>
                    )}

                    {donation.transportMode === 'HOSPITAL_PICKUP' && donation.pickupStatus === 'ACCEPTED' && (
                      <Button 
                        variant="primary" 
                        size="sm"
                        className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white"
                        onClick={() => handleDispatch(donation._id)}
                        disabled={processingId === donation._id}
                      >
                        Mark Transport Dispatched
                      </Button>
                    )}

                    {((donation.transportMode === 'HOSPITAL_PICKUP' && donation.pickupStatus === 'DISPATCHED') || 
                      (donation.transportMode === 'SELF' && donation.pickupStatus === 'NONE')) && (
                      <Button 
                        variant="primary" 
                        size="sm"
                        className="w-full sm:w-auto bg-slate-800 hover:bg-slate-900 text-white"
                        onClick={() => handleArrived(donation._id)}
                        disabled={processingId === donation._id}
                      >
                        Confirm Donor Arrived
                      </Button>
                    )}

                    {((donation.transportMode === 'HOSPITAL_PICKUP' && donation.pickupStatus === 'ARRIVED') || 
                      (donation.transportMode === 'SELF' && donation.pickupStatus === 'ARRIVED')) && (
                      <Button 
                        variant="primary" 
                        className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white shadow-sm"
                        onClick={() => handleCompleteDonation(donation._id)}
                        disabled={processingId === donation._id || donation.requestId?.status === 'FULFILLED'}
                      >
                        {processingId === donation._id ? 'Processing...' : 'Confirm Donation Finished'}
                      </Button>
                    )}

                    {donation.transportMode === 'NONE' && (
                      <span className="text-sm font-medium text-slate-500 italic">Waiting for donor transport choice...</span>
                    )}

                    {donation.pickupStatus === 'CANCELLED' && (
                      <span className="text-sm font-medium text-slate-500 italic">Donor cancelled pickup request. Waiting for donor arrival...</span>
                    )}

                    <button
                      onClick={() => setOpenChatId(openChatId === donation._id ? null : donation._id)}
                      className="mt-2 flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-md text-sm font-semibold transition-colors border border-slate-200"
                    >
                      💬 {openChatId === donation._id ? 'Close Chat' : 'Chat with Donor'}
                    </button>
                  </div>
                </CardBody>
                {openChatId === donation._id && (
                  <div className="border-t border-slate-200 bg-slate-50 p-4">
                    <ChatBox donationId={donation._id} currentUserId={user._id} />
                  </div>
                )}
              </Card>
            ))
          )}
        </div>

        {/* Active Requests */}
        <div className="space-y-4" id="active-requests">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-slate-900">Operational Requests</h2>
          </div>
          
          {requests.length === 0 ? (
            <Card className="bg-slate-50 border-slate-200">
              <CardBody className="text-center py-10">
                <p className="text-slate-500">No active operational requests.</p>
              </CardBody>
            </Card>
          ) : (
            requests.map(req => (
              <Card key={req._id} className={`overflow-hidden border ${req.urgency === 'CRITICAL' ? 'border-red-200' : 'border-slate-200'}`}>
                {req.urgency === 'CRITICAL' && (
                  <div className="bg-red-600 text-white text-[10px] font-bold px-3 py-1 uppercase tracking-widest text-center">
                    Critical Emergency
                  </div>
                )}
                <CardBody className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl font-bold text-slate-900">{req.bloodGroupRequired}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          req.status === 'OPEN' ? 'bg-blue-100 text-blue-800' :
                          req.status === 'PARTIALLY_FULFILLED' ? 'bg-yellow-100 text-yellow-800' :
                          req.status === 'FULFILLED' ? 'bg-green-100 text-green-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Patient: {req.patientName}</p>
                    </div>
                    {req.urgency === 'URGENT' && (
                      <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-1 rounded uppercase">Urgent</span>
                    )}
                  </div>
                  
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <ProgressBar 
                      current={req.unitsFulfilled} 
                      total={req.unitsRequired} 
                      label="Units Secured" 
                    />
                  </div>
                  
                  <div className="mt-3 flex justify-between items-center text-xs text-slate-500">
                    <span>Target: {new Date(req.requiredBy).toLocaleDateString()}</span>
                    <span className="font-medium text-slate-700">{req.unitsRequired - req.unitsFulfilled} units remaining</span>
                  </div>
                </CardBody>
              </Card>
            ))
          )}
        </div>
        
      </div>
    </div>
  );
};

export default HospitalDashboard;
