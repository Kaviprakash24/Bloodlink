import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import ProgressBar from '../components/ui/ProgressBar';
import LocationMap from '../components/map/LocationMap';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const RequesterDashboard = () => {
  const { user } = useContext(AuthContext);
  
  const [hospitals, setHospitals] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    hospitalId: '',
    bloodGroupRequired: '',
    unitsRequired: 1,
    patientName: '',
    city: '',
    postalCode: '',
    urgency: 'NORMAL',
    requiredBy: ''
  });

  // Modal State for viewing matches
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [matches, setMatches] = useState([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [myInvitations, setMyInvitations] = useState([]);
  const [isInviting, setIsInviting] = useState(null);

  useEffect(() => {
    fetchHospitals();
    fetchMyRequests();
    fetchMyInvitations();
  }, []);

  const fetchHospitals = async () => {
    try {
      const res = await api.get('/hospitals');
      setHospitals(res.data);
    } catch (err) {
      console.error('Failed to fetch hospitals', err);
    }
  };

  const fetchMyRequests = async () => {
    try {
      setIsLoadingRequests(true);
      const res = await api.get('/requests/my-requests');
      setMyRequests(res.data);
    } catch (err) {
      console.error('Failed to fetch requests', err);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const fetchMyInvitations = async () => {
    try {
      const res = await api.get('/donations/my-requests');
      setMyInvitations(res.data);
    } catch (err) {
      console.error('Failed to fetch invitations', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      if (!formData.hospitalId) {
        throw new Error('Please select a hospital');
      }

      await api.post('/requests', formData);
      
      setSuccess('Blood request created successfully!');
      setFormData({
        hospitalId: '',
        bloodGroupRequired: '',
        unitsRequired: 1,
        patientName: '',
        city: '',
        postalCode: '',
        urgency: 'NORMAL',
        requiredBy: ''
      });
      
      fetchMyRequests();
      // Scroll to requests view
      document.getElementById('my-requests')?.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      setError(err.message || err.response?.data?.message || 'Failed to create request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewMatches = async (requestId) => {
    if (selectedRequest === requestId) {
      setSelectedRequest(null);
      setMatches([]);
      return;
    }

    try {
      setIsLoadingMatches(true);
      setSelectedRequest(requestId);
      const res = await api.get(`/requests/${requestId}/matches`);
      setMatches(res.data.matches);
    } catch (err) {
      console.error('Failed to fetch matches', err);
    } finally {
      setIsLoadingMatches(false);
    }
  };

  const handleSendInvite = async (requestId, donorId) => {
    try {
      setIsInviting(donorId);
      await api.post('/donations/invite', { requestId, donorId });
      await fetchMyInvitations();
    } catch (err) {
      console.error('Failed to send invite', err);
      alert(err.response?.data?.message || 'Failed to send invite');
    } finally {
      setIsInviting(null);
    }
  };

  const activeRequestsCount = myRequests.filter(r => ['OPEN', 'ACCEPTED'].includes(r.status)).length;
  const fulfilledRequestsCount = myRequests.filter(r => ['FULFILLED', 'COMPLETED'].includes(r.status)).length;
  const pendingMatchesCount = myInvitations.filter(i => i.status === 'REQUESTED').length;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-900 rounded-xl p-8 text-white shadow-lg">
        <div>
          <h1 className="text-3xl font-bold">{getGreeting()}, {user.firstName}.</h1>
          <p className="text-slate-300 mt-2 text-lg">Manage your blood requests and coordinate with donors.</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-slate-800 rounded-lg p-4 text-center border border-slate-700 min-w-[100px]">
            <p className="text-slate-400 text-sm font-medium">Active</p>
            <p className="text-2xl font-bold text-white mt-1">{activeRequestsCount}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 text-center border border-slate-700 min-w-[100px]">
            <p className="text-slate-400 text-sm font-medium">Pending</p>
            <p className="text-2xl font-bold text-yellow-400 mt-1">{pendingMatchesCount}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 text-center border border-slate-700 min-w-[100px]">
            <p className="text-slate-400 text-sm font-medium">Fulfilled</p>
            <p className="text-2xl font-bold text-green-400 mt-1">{fulfilledRequestsCount}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        <a href="#create-request" className="whitespace-nowrap px-4 py-2 bg-red-600 text-white rounded-full text-sm font-semibold hover:bg-red-700 transition-colors shadow-sm">➕ Request Blood</a>
        <a href="#my-requests" className="whitespace-nowrap px-4 py-2 bg-slate-100 text-slate-700 rounded-full text-sm font-medium border border-slate-200 hover:bg-slate-200 transition-colors">View My Requests</a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Create Request Form */}
        <div className="lg:col-span-1 space-y-6" id="create-request">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
              <CardTitle>Create New Request</CardTitle>
              <p className="text-sm text-slate-500 mt-1">Fill out patient details carefully.</p>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">{error}</div>}
                {success && <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg border border-green-100">{success}</div>}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Select Hospital</label>
                  <select
                    name="hospitalId"
                    value={formData.hospitalId}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors"
                  >
                    <option value="">-- Choose Verified Hospital --</option>
                    {hospitals.map(h => (
                      <option key={h._id} value={h._id}>{h.name} ({h.city})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Blood Group</label>
                    <select
                      name="bloodGroupRequired"
                      value={formData.bloodGroupRequired}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors"
                    >
                      <option value="">Select</option>
                      {['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'].map(bg => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>
                  <Input
                    label="Units"
                    name="unitsRequired"
                    type="number"
                    min="1"
                    value={formData.unitsRequired}
                    onChange={handleChange}
                    required
                  />
                </div>

                <Input
                  label="Patient Name"
                  name="patientName"
                  value={formData.patientName}
                  onChange={handleChange}
                  required
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="City"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    required
                  />
                  <Input
                    label="PIN Code"
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Urgency</label>
                  <select
                    name="urgency"
                    value={formData.urgency}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="URGENT">Urgent (Within 48hrs)</option>
                    <option value="CRITICAL">Critical (Immediate)</option>
                  </select>
                </div>

                <Input
                  label="Required By (Date)"
                  name="requiredBy"
                  type="date"
                  value={formData.requiredBy}
                  onChange={handleChange}
                  required
                />

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full mt-6"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Submit Blood Request'}
                </Button>
              </form>
            </CardBody>
          </Card>
        </div>

        {/* My Requests List */}
        <div className="lg:col-span-2 space-y-6" id="my-requests">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-bold text-slate-900">Active & Past Requests</h2>
            <Button variant="outline" size="sm" onClick={fetchMyRequests} disabled={isLoadingRequests}>
              Refresh
            </Button>
          </div>
          
          {isLoadingRequests ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : myRequests.length === 0 ? (
            <Card className="bg-slate-50 border-dashed border-2 border-slate-300">
              <CardBody className="text-center py-16">
                <div className="w-16 h-16 mx-auto bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                  <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900">No active requests</h3>
                <p className="text-slate-500 mt-2 max-w-md mx-auto mb-6">
                  BloodLink matches your requests instantly with donors in your area. Use the form to create a new blood request.
                </p>
                <a href="#create-request" className="inline-flex px-6 py-3 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors shadow-sm">
                  Create First Request
                </a>
              </CardBody>
            </Card>
          ) : (
            <div className="space-y-4">
              {myRequests.map(req => (
                <Card key={req._id} className={`overflow-hidden transition-all border ${req.urgency === 'CRITICAL' ? 'border-red-200' : 'border-slate-200'}`}>
                  {req.urgency === 'CRITICAL' && (
                    <div className="bg-red-600 text-white text-xs font-bold px-4 py-1.5 uppercase tracking-wider text-center flex items-center justify-center gap-2">
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                      Critical Emergency Request
                    </div>
                  )}
                  <CardBody className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center p-5">
                    <div className="w-full sm:w-2/3">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="px-3 py-1 bg-slate-800 text-white text-sm font-bold rounded">
                          {req.bloodGroupRequired}
                        </span>
                        {req.urgency === 'URGENT' && (
                          <span className="px-2.5 py-0.5 bg-orange-100 text-orange-700 text-xs font-bold rounded border border-orange-200">
                            URGENT
                          </span>
                        )}
                        <span className={`text-xs font-bold px-2 py-0.5 rounded border ${
                          ['OPEN', 'ACCEPTED'].includes(req.status) ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          ['FULFILLED', 'COMPLETED'].includes(req.status) ? 'bg-green-50 text-green-700 border-green-200' :
                          'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                      <h4 className="text-lg font-bold text-slate-900">
                        Patient: {req.patientName}
                      </h4>
                      <p className="text-sm text-slate-600 mt-1 mb-4">
                        {req.hospitalId?.name} • {req.city}
                      </p>
                      
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <ProgressBar 
                          current={req.unitsFulfilled || 0} 
                          total={req.unitsRequired} 
                          label="Units Fulfilled" 
                        />
                      </div>

                      <p className="text-xs text-slate-500 mt-3 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        Needed by: <span className="font-medium text-slate-700">{new Date(req.requiredBy).toLocaleDateString()}</span>
                      </p>
                    </div>
                    
                    <div className="w-full sm:w-auto shrink-0 flex flex-col gap-2 mt-4 sm:mt-0">
                      <Button 
                        variant={selectedRequest === req._id ? "outline" : "primary"}
                        onClick={() => handleViewMatches(req._id)}
                        className="w-full sm:w-auto"
                      >
                        {selectedRequest === req._id ? 'Close Matches' : 'Find Donors'}
                      </Button>
                    </div>
                  </CardBody>
                  
                  {/* Matches Dropdown UI */}
                  {selectedRequest === req._id && (
                    <div className="border-t border-slate-200 bg-slate-50 p-5">
                      {req.hospitalId?.location && (
                        <div className="mb-6 rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                          <LocationMap 
                            hospitalLocation={req.hospitalId.location} 
                            hospitalName={req.hospitalId.name}
                            searchRadiusKm={req.urgency === 'URGENT' ? 50 : req.urgency === 'CRITICAL' ? 30 : 15}
                            className="h-48 w-full z-0"
                          />
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center mb-4">
                        <h5 className="font-bold text-slate-800">Compatible Donors</h5>
                        <span className="text-xs font-semibold bg-white border border-slate-200 px-2 py-1 rounded text-slate-600">
                          {matches.length} matches found
                        </span>
                      </div>
                      
                      {isLoadingMatches ? (
                        <div className="flex justify-center items-center py-6">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        </div>
                      ) : matches.length === 0 ? (
                        <div className="text-center py-6 bg-white rounded-lg border border-slate-200">
                          <p className="text-sm text-slate-500">No compatible donors found yet. We will keep searching.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {matches.map(match => {
                            // Find any existing invitation for this donor and request
                            const existingInvite = myInvitations.find(inv => 
                              inv.donorId?._id === match.user?._id && 
                              inv.requestId === req._id && 
                              inv.status !== 'CANCELLED'
                            );
                            
                            return (
                            <div key={match._id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-white rounded-lg border border-slate-200 shadow-sm gap-4 transition-hover hover:border-blue-300">
                              <div className="flex items-center gap-4">
                                {match.matchScore !== undefined && (
                                  <div className="w-14 h-14 rounded-full border-4 border-blue-100 flex flex-col items-center justify-center shrink-0 bg-white shadow-inner">
                                    <span className="text-sm font-bold text-blue-700 leading-none">{match.matchScore}%</span>
                                    <span className="text-[9px] text-slate-500 font-bold tracking-wider mt-0.5">MATCH</span>
                                  </div>
                                )}
                                <div>
                                  <p className="font-bold text-slate-900">{match.user?.firstName} {match.user?.lastName}</p>
                                  <p className="text-xs text-slate-600 mb-2 mt-0.5 flex items-center gap-1">
                                    <span className="font-semibold text-slate-800">{match.bloodGroup}</span> • {match.city}
                                    {match.calculatedDistance !== null && match.calculatedDistance !== undefined && (
                                      <span className="text-blue-600 font-medium"> • ~{(match.calculatedDistance / 1000).toFixed(1)} km</span>
                                    )}
                                  </p>
                                  
                                  {match.matchTags && match.matchTags.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                      {match.matchTags.map((tag, idx) => (
                                        <span key={idx} className="inline-flex px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-bold text-slate-600 uppercase tracking-wide">
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <div className="w-full md:w-auto flex justify-end">
                                {existingInvite ? (
                                  <div className={`text-sm px-4 py-2 font-bold rounded-lg border ${
                                    existingInvite.status === 'ACCEPTED' ? 'bg-green-50 text-green-700 border-green-200' :
                                    existingInvite.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200' :
                                    existingInvite.status === 'COMPLETED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                    'bg-slate-50 text-slate-700 border-slate-200'
                                  }`}>
                                    {existingInvite.status === 'REQUESTED' ? 'INVITATION PENDING' : existingInvite.status}
                                  </div>
                                ) : (
                                  <Button 
                                    variant="outline" 
                                    className="w-full md:w-auto text-sm bg-white border-slate-300 hover:bg-slate-50 hover:text-blue-700"
                                    onClick={() => handleSendInvite(req._id, match.user._id)}
                                    disabled={isInviting === match.user._id}
                                  >
                                    {isInviting === match.user._id ? 'Sending...' : 'Invite to Donate'}
                                  </Button>
                                )}
                              </div>
                            </div>
                          )})}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequesterDashboard;
