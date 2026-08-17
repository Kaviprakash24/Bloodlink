import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import ConfirmationDialog from '../components/ui/ConfirmationDialog';
import ChatBox from '../components/chat/ChatBox';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const DonorDashboard = () => {
  const { user } = useContext(AuthContext);
  
  const [profile, setProfile] = useState({
    bloodGroup: '',
    city: '',
    postalCode: '',
    isAvailable: true,
    donationCount: 0
  });
  
  const [coords, setCoords] = useState(null);
  const [isExactLocation, setIsExactLocation] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [nearbyRequests, setNearbyRequests] = useState([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [incomingInvites, setIncomingInvites] = useState([]);
  const [isLoadingInvites, setIsLoadingInvites] = useState(true);
  const [isResponding, setIsResponding] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Chat state
  const [openChatId, setOpenChatId] = useState(null);

  // Confirmation Dialog State
  const [rejectDialogState, setRejectDialogState] = useState({ isOpen: false, donationId: null });

  useEffect(() => {
    fetchProfile();
    fetchIncomingInvites();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/donors/profile');
      setProfile({
        bloodGroup: res.data.bloodGroup || '',
        city: res.data.city || '',
        postalCode: res.data.postalCode || '',
        isAvailable: res.data.isAvailable,
        donationCount: res.data.donationCount || 0
      });
      if (res.data.location && res.data.location.coordinates) {
        setCoords({
          longitude: res.data.location.coordinates[0],
          latitude: res.data.location.coordinates[1]
        });
        setIsExactLocation(res.data.isExactLocation);
      }
      fetchNearbyRequests();
    } catch (err) {
      if (err.response?.status !== 404) {
        setError('Failed to load profile.');
      }
      setIsLoadingRequests(false);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const fetchNearbyRequests = async () => {
    try {
      setIsLoadingRequests(true);
      const res = await api.get('/requests/nearby');
      setNearbyRequests(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const fetchIncomingInvites = async () => {
    try {
      setIsLoadingInvites(true);
      const res = await api.get('/donations/incoming');
      setIncomingInvites(res.data);
    } catch (err) {
      console.error('Failed to fetch incoming invites', err);
    } finally {
      setIsLoadingInvites(false);
    }
  };

  const handleRespond = async (donationId, response) => {
    try {
      setIsResponding(donationId);
      await api.put(`/donations/${donationId}/respond`, { response });
      setSuccess(`Successfully ${response === 'ACCEPT' ? 'accepted' : 'rejected'} the request!`);
      await fetchIncomingInvites();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to respond to request');
    } finally {
      setIsResponding(null);
    }
  };

  const handleVolunteer = async (requestId) => {
    try {
      setIsResponding(requestId);
      await api.post('/donations/volunteer', { requestId });
      setSuccess('Successfully volunteered for this request!');
      await fetchNearbyRequests();
      await fetchIncomingInvites();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to volunteer for request');
    } finally {
      setIsResponding(null);
    }
  };

  const handleTransportChoice = async (donationId, mode) => {
    try {
      setIsResponding(donationId);
      await api.put(`/donations/${donationId}/transport`, { mode });
      setSuccess(mode === 'SELF' ? 'Transport mode set to Self Arranged' : 'Hospital pickup requested!');
      await fetchIncomingInvites();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update transport choice');
    } finally {
      setIsResponding(null);
    }
  };

  const handleCancelPickup = async (donationId) => {
    try {
      setIsResponding(donationId);
      await api.put(`/donations/${donationId}/pickup/cancel`);
      setSuccess('Pickup request cancelled successfully');
      await fetchIncomingInvites();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel pickup');
    } finally {
      setIsResponding(null);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          longitude: position.coords.longitude,
          latitude: position.coords.latitude
        });
        setIsExactLocation(true);
        setSuccess('Precise location acquired!');
      },
      () => {
        setError('Unable to retrieve your location. Falling back to City/PIN.');
        setCoords(null);
        setIsExactLocation(false);
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = { ...profile };
      if (coords) {
        payload.longitude = coords.longitude;
        payload.latitude = coords.latitude;
        payload.isExactLocation = isExactLocation;
      }

      await api.put('/donors/profile', payload);
      setSuccess('Profile updated successfully!');
      fetchNearbyRequests();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingProfile) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isProfileComplete = profile.bloodGroup && profile.city && profile.postalCode;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 rounded-xl p-8 text-white shadow-lg animate-fade-slide-up">
        <div>
          <h1 className="text-3xl font-bold">{getGreeting()}, {user.firstName}.</h1>
          <p className="text-slate-300 mt-2 text-lg">Your blood type is the most powerful resource. Thank you for being here.</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-slate-800 rounded-lg p-4 text-center border border-slate-700 min-w-[120px]">
            <p className="text-slate-400 text-sm font-medium">Blood Group</p>
            <p className="text-2xl font-bold text-red-400 mt-1">{profile.bloodGroup || '--'}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 text-center border border-slate-700 min-w-[120px]">
            <p className="text-slate-400 text-sm font-medium">Donations</p>
            <p className="text-2xl font-bold text-white mt-1">{profile.donationCount}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide animate-fade-slide-up delay-100 opacity-0">
        <a href="#urgent-requests" className="whitespace-nowrap px-4 py-2 bg-red-50 text-red-700 rounded-full text-sm font-semibold border border-red-100 hover:bg-red-100 transition-colors">🚨 Find Urgent Requests</a>
        <a href="#profile-settings" className="whitespace-nowrap px-4 py-2 bg-slate-100 text-slate-700 rounded-full text-sm font-medium border border-slate-200 hover:bg-slate-200 transition-colors">Update Location</a>
        <a href="#incoming-invites" className="whitespace-nowrap px-4 py-2 bg-slate-100 text-slate-700 rounded-full text-sm font-medium border border-slate-200 hover:bg-slate-200 transition-colors">View Invitations</a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Profile Section */}
        <div className="lg:col-span-1 space-y-6 animate-fade-slide-up delay-200 opacity-0" id="profile-settings">
          <Card>
            <CardHeader>
              <CardTitle>Donation Profile</CardTitle>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">{error}</div>}
                {success && <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg border border-green-100">{success}</div>}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Blood Group</label>
                  <select
                    name="bloodGroup"
                    value={profile.bloodGroup}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors"
                  >
                    <option value="">Select Blood Group</option>
                    {['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'].map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>

                <Input
                  label="City"
                  name="city"
                  value={profile.city}
                  onChange={handleChange}
                  required
                />
                
                <Input
                  label="PIN / Postal Code"
                  name="postalCode"
                  value={profile.postalCode}
                  onChange={handleChange}
                  required
                />

                <div className="pt-2">
                  <div className="mb-3 text-xs text-slate-600 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                    <span className="font-semibold text-blue-700 block mb-1">Why provide location?</span> 
                    Exact location enables our matching engine to notify you immediately if a patient nearby needs blood, saving critical time.
                  </div>
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    className="w-full px-4 py-2 bg-slate-50 text-slate-700 text-sm font-medium rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.242-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    {coords && isExactLocation ? 'Update Precise Location' : 'Use My Current Location'}
                  </button>
                  
                  <div className="mt-3 flex justify-center">
                    {coords && isExactLocation ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        Precise Location Active
                      </span>
                    ) : coords && !isExactLocation ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                        Approximate Location (City/PIN)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                        <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                        City/PIN Only
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col space-y-2 pt-2 border-t border-slate-100 mt-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isAvailable"
                      name="isAvailable"
                      checked={profile.isAvailable}
                      onChange={handleChange}
                      className="h-4 w-4 text-primary focus:ring-primary border-slate-300 rounded cursor-pointer"
                    />
                    <label htmlFor="isAvailable" className="ml-2 block text-sm font-medium text-slate-700 cursor-pointer">
                      I am currently available to donate
                    </label>
                  </div>
                  <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-100">
                    Your recorded donation history may affect matching availability. Final eligibility is determined by the blood collection center.
                  </p>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full mt-4"
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save Profile Settings'}
                </Button>
              </form>
            </CardBody>
          </Card>
        </div>

        {/* Requests & Invites Feed */}
        <div className="lg:col-span-2 space-y-6 animate-fade-slide-up delay-300 opacity-0">
          
          {/* Incoming Invites Section */}
          {incomingInvites.length > 0 && (
            <div className="space-y-4 mb-8" id="incoming-invites">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                Pending Invitations
              </h2>
              {incomingInvites.map(invite => (
                <Card key={invite._id} className="border-red-200 bg-white shadow-sm overflow-hidden">
                  <div className="bg-red-50 px-4 py-2 border-b border-red-100 flex justify-between items-center">
                    <span className="text-xs font-bold text-red-700 uppercase tracking-wide">Hospital Request</span>
                    <span className="text-xs text-red-500">Required by: {new Date(invite.requestId?.requiredBy).toLocaleDateString()}</span>
                  </div>
                  <CardBody className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2.5 py-0.5 bg-slate-800 text-white text-xs font-bold rounded">
                          {invite.requestId?.bloodGroupRequired}
                        </span>
                        <span className={`px-2.5 py-0.5 text-xs font-bold rounded ${
                          invite.requestId?.urgency === 'CRITICAL' ? 'bg-red-100 text-red-700 border border-red-200' : 
                          invite.requestId?.urgency === 'URGENT' ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {invite.requestId?.urgency}
                        </span>
                        {invite.status === 'ACCEPTED' && (
                          <span className="px-2.5 py-0.5 bg-green-100 text-green-800 text-xs font-bold rounded border border-green-200">
                            ACCEPTED BY YOU
                          </span>
                        )}
                      </div>
                      <h4 className="text-lg font-bold text-slate-900">
                        {invite.requestId?.hospitalId?.name || 'Unknown Hospital'}
                      </h4>
                      <p className="text-sm text-slate-600 mt-1">
                        {invite.requestId?.hospitalId?.city} • {invite.requestId?.unitsRequired - invite.requestId?.unitsFulfilled} Units Needed
                      </p>
                    </div>
                    {invite.status === 'REQUESTED' ? (
                      <div className="flex gap-2 w-full sm:w-auto shrink-0 mt-4 sm:mt-0">
                        <Button 
                          variant="outline"
                          className="flex-1 sm:flex-none border-slate-300 text-slate-700 hover:bg-slate-50"
                          onClick={() => setRejectDialogState({ isOpen: true, donationId: invite._id })}
                          disabled={isResponding === invite._id}
                        >
                          Decline
                        </Button>
                        <Button 
                          variant="primary" 
                          className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 text-white"
                          onClick={() => handleRespond(invite._id, 'ACCEPT')}
                          disabled={isResponding === invite._id}
                        >
                          {isResponding === invite._id ? 'Saving...' : 'Accept Invitation'}
                        </Button>
                      </div>
                        ) : (
                          <div className="w-full mt-4 sm:mt-0 flex flex-col sm:items-end gap-3">
                            {invite.transportMode === 'NONE' ? (
                              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 w-full sm:w-80">
                                <p className="text-sm font-bold text-slate-800 mb-2">How will you reach the hospital?</p>
                                {invite.status === 'ACCEPTED' ? (
                                  <div className="flex flex-col gap-2">
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="w-full border-slate-300 text-slate-700 justify-center"
                                      onClick={() => handleTransportChoice(invite._id, 'SELF')}
                                      disabled={isResponding === invite._id}
                                    >
                                      I'll Arrange Transport
                                    </Button>
                                    <Button 
                                      variant="primary" 
                                      size="sm" 
                                      className="w-full bg-slate-800 hover:bg-slate-900 justify-center"
                                      onClick={() => handleTransportChoice(invite._id, 'HOSPITAL_PICKUP')}
                                      disabled={isResponding === invite._id}
                                    >
                                      Request Hospital Pickup
                                    </Button>
                                  </div>
                                ) : (
                                  <p className="text-xs text-slate-500 italic">This donation is {invite.status.toLowerCase()}. Transport coordination is closed.</p>
                                )}
                              </div>
                            ) : (
                              <div className="bg-white p-4 rounded-lg border border-slate-200 w-full sm:w-80 shadow-sm">
                                <div className="flex justify-between items-start mb-3">
                                  <h5 className="text-sm font-bold text-slate-900">Transport Status</h5>
                                  {invite.transportMode === 'HOSPITAL_PICKUP' && invite.pickupStatus === 'REQUESTED' && (
                                    <button 
                                      onClick={() => handleCancelPickup(invite._id)}
                                      disabled={isResponding === invite._id}
                                      className="text-xs font-medium text-red-600 hover:text-red-700 underline"
                                    >
                                      Cancel Request
                                    </button>
                                  )}
                                </div>
                                
                                {invite.transportMode === 'SELF' ? (
                                  <div className="flex items-center gap-2 text-sm text-slate-700">
                                    <span className="p-1.5 bg-blue-100 text-blue-700 rounded-md">🚗</span>
                                    <div>
                                      <p className="font-semibold text-slate-900">Self Arranged</p>
                                      <p className="text-xs text-slate-500">Please arrive by {new Date(invite.requestId?.requiredBy).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm">
                                      <span className={`p-1.5 rounded-md flex-shrink-0 ${
                                        invite.pickupStatus === 'REQUESTED' ? 'bg-yellow-100 text-yellow-700' :
                                        invite.pickupStatus === 'ACCEPTED' ? 'bg-blue-100 text-blue-700' :
                                        invite.pickupStatus === 'DISPATCHED' ? 'bg-purple-100 text-purple-700' :
                                        invite.pickupStatus === 'ARRIVED' ? 'bg-green-100 text-green-700' :
                                        invite.pickupStatus === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                        'bg-slate-100 text-slate-700'
                                      }`}>
                                        {invite.pickupStatus === 'REQUESTED' ? '⏳' :
                                         invite.pickupStatus === 'ACCEPTED' ? '👍' :
                                         invite.pickupStatus === 'DISPATCHED' ? '🚑' :
                                         invite.pickupStatus === 'ARRIVED' ? '📍' :
                                         invite.pickupStatus === 'REJECTED' ? '❌' : '🚗'}
                                      </span>
                                      <div>
                                        <p className="font-semibold text-slate-900">
                                          {invite.pickupStatus === 'REQUESTED' ? 'Pickup Requested' :
                                           invite.pickupStatus === 'ACCEPTED' ? 'Pickup Approved' :
                                           invite.pickupStatus === 'DISPATCHED' ? 'Transport Dispatched!' :
                                           invite.pickupStatus === 'ARRIVED' ? 'Arrived at Hospital' :
                                           invite.pickupStatus === 'REJECTED' ? 'Pickup Unavailable' : 
                                           invite.pickupStatus}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                          {invite.pickupStatus === 'REQUESTED' ? 'Waiting for hospital...' :
                                           invite.pickupStatus === 'ACCEPTED' ? 'Hospital is arranging transport.' :
                                           invite.pickupStatus === 'DISPATCHED' ? 'Vehicle is on the way.' :
                                           invite.pickupStatus === 'REJECTED' ? 'Please arrange your own transport.' :
                                           'Coordination active.'}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Communication Actions - Always available if ACCEPTED */}
                            <div className="w-full sm:w-80">
                              {invite.requestId?.hospitalId?.contactNumber && (
                                <a 
                                  href={`tel:${invite.requestId.hospitalId.contactNumber}`}
                                  className="flex items-center justify-center gap-2 w-full py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-md text-sm font-semibold transition-colors border border-green-200 mb-2"
                                >
                                  📞 Contact Hospital
                                </a>
                              )}
                              
                              <button
                                onClick={() => setOpenChatId(openChatId === invite._id ? null : invite._id)}
                                className="flex items-center justify-center gap-2 w-full py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-md text-sm font-semibold transition-colors border border-slate-200"
                              >
                                💬 {openChatId === invite._id ? 'Close Chat' : 'Chat with Hospital'}
                              </button>
                              
                              {openChatId === invite._id && (
                                <div className="mt-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                                  <ChatBox donationId={invite._id} currentUserId={user._id} />
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
          
          <div className="flex items-center gap-2 mb-4" id="urgent-requests">
            <h2 className="text-xl font-bold text-slate-900">🚨 Urgent Requests Near You</h2>
          </div>
          
          {!isProfileComplete ? (
            <Card className="bg-slate-50 border-dashed border-2 border-slate-300">
              <CardBody className="text-center py-10">
                <div className="w-16 h-16 mx-auto bg-slate-200 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900">Complete Your Profile</h3>
                <p className="text-slate-500 mt-2 max-w-md mx-auto">
                  We need your blood group and location to match you with critical patients in your area.
                </p>
              </CardBody>
            </Card>
          ) : isLoadingRequests ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : nearbyRequests.length === 0 ? (
            <Card className="bg-slate-50 border-slate-200 shadow-none">
              <CardBody className="text-center py-12">
                <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900">All clear in your area</h3>
                <p className="text-slate-500 mt-2">There are currently no urgent requests matching your blood group nearby. We'll notify you when someone needs help.</p>
              </CardBody>
            </Card>
          ) : (
            <div className="space-y-4">
              {nearbyRequests.map(req => (
                <Card key={req._id} className={`overflow-hidden transition-all hover:shadow-md ${req.urgency === 'CRITICAL' ? 'border-red-200' : 'border-slate-200'}`}>
                  {req.urgency === 'CRITICAL' && (
                    <div className="bg-red-600 text-white text-xs font-bold px-4 py-1.5 uppercase tracking-wider text-center flex items-center justify-center gap-2">
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                      Critical Emergency Match
                    </div>
                  )}
                  <CardBody className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center p-5">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="px-2.5 py-0.5 bg-slate-800 text-white text-xs font-bold rounded">
                          {req.bloodGroupRequired} Required
                        </span>
                        {req.urgency === 'URGENT' && (
                          <span className="px-2.5 py-0.5 bg-orange-100 text-orange-700 text-xs font-bold rounded border border-orange-200">
                            URGENT
                          </span>
                        )}
                        <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded border border-slate-200">
                          {req.unitsRequired - req.unitsFulfilled} Units Remaining
                        </span>
                      </div>
                      <h4 className="text-lg font-bold text-slate-900">
                        {req.hospital?.name || 'Unknown Hospital'}
                      </h4>
                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.242-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                          {req.city}
                        </span>
                        {req.calculatedDistance !== null && req.calculatedDistance !== undefined && (
                          <span className="flex items-center gap-1 font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                            ~{(req.calculatedDistance / 1000).toFixed(1)} km away
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="w-full sm:w-auto shrink-0 mt-4 sm:mt-0">
                      <Button 
                        variant="primary" 
                        className={`w-full sm:w-auto shadow-sm ${req.urgency === 'CRITICAL' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}`}
                        onClick={() => handleVolunteer(req._id)}
                        disabled={isResponding === req._id}
                      >
                        {isResponding === req._id ? 'Processing...' : 'Volunteer Now'}
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmationDialog
        isOpen={rejectDialogState.isOpen}
        title="Decline Invitation"
        message="Are you sure you want to decline this request? The hospital will be notified immediately so they can find another donor."
        confirmLabel="Decline Request"
        onConfirm={() => {
          handleRespond(rejectDialogState.donationId, 'REJECT');
          setRejectDialogState({ isOpen: false, donationId: null });
        }}
        onCancel={() => setRejectDialogState({ isOpen: false, donationId: null })}
      />
    </div>
  );
};

export default DonorDashboard;
