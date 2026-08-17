import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { Card, CardHeader, CardTitle, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import ConfirmationDialog from '../components/ui/ConfirmationDialog';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  
  // Hospital Verification State
  const [hospitals, setHospitals] = useState([]);
  const [loadingHospitals, setLoadingHospitals] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [rejectDialogState, setRejectDialogState] = useState({ isOpen: false, hospitalId: null });

  // Analytics State
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [analyticsData, setAnalyticsData] = useState({
    overview: null,
    bloodGroups: [],
    status: [],
    performance: null,
    locations: [],
    trends: []
  });
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [error, setError] = useState('');

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#d0ed57'];

  useEffect(() => {
    fetchPendingHospitals();
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoadingAnalytics(true);
      const query = new URLSearchParams();
      if (dateRange.startDate) query.append('startDate', dateRange.startDate);
      if (dateRange.endDate) query.append('endDate', dateRange.endDate);
      const qs = query.toString() ? `?${query.toString()}` : '';

      const [overview, bloodGroups, status, performance, locations, trends] = await Promise.all([
        api.get(`/admin/analytics/overview${qs}`),
        api.get(`/admin/analytics/blood-groups${qs}`),
        api.get(`/admin/analytics/status${qs}`),
        api.get(`/admin/analytics/performance${qs}`),
        api.get(`/admin/analytics/locations${qs}`),
        api.get(`/admin/analytics/trends${qs}`)
      ]);

      setAnalyticsData({
        overview: overview.data,
        bloodGroups: bloodGroups.data,
        status: status.data,
        performance: performance.data,
        locations: locations.data,
        trends: trends.data
      });
    } catch (err) {
      console.error('Failed to fetch analytics', err);
      setError('Failed to load analytics data.');
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const fetchPendingHospitals = async () => {
    try {
      setLoadingHospitals(true);
      const res = await api.get('/admin/hospitals/pending');
      setHospitals(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load pending hospitals.');
    } finally {
      setLoadingHospitals(false);
    }
  };

  const handleVerification = async (hospitalId, status) => {
    try {
      setProcessingId(hospitalId);
      await api.put(`/admin/hospitals/${hospitalId}/verify`, { status });
      // Remove from list
      setHospitals(prev => prev.filter(h => h._id !== hospitalId));
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to verify hospital');
    } finally {
      setProcessingId(null);
    }
  };

  if (loadingHospitals && loadingAnalytics) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-slate-900 rounded-xl p-8 text-white shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold mb-1">BloodLink Operations</h1>
            <p className="text-slate-300 text-lg">System Overview & Administration</p>
          </div>
          
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            <a href="#action-required" className="whitespace-nowrap px-4 py-2 bg-yellow-500 text-yellow-950 rounded-full text-sm font-bold shadow-sm hover:bg-yellow-400 transition-colors">
              {hospitals.length} Pending Verifications
            </a>
            <a href="#analytics" className="whitespace-nowrap px-4 py-2 bg-slate-800 text-slate-200 rounded-full text-sm font-medium border border-slate-700 hover:bg-slate-700 transition-colors">
              View Analytics
            </a>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {error}
        </div>
      )}

      {/* Operational Overview KPI Cards */}
      {analyticsData.overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardBody className="p-5">
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-1">Network Donors</p>
              <h4 className="text-3xl font-bold text-slate-900">{analyticsData.overview.totalDonors}</h4>
              <p className="text-xs font-semibold text-green-600 mt-2 bg-green-50 inline-block px-2 py-0.5 rounded">
                {analyticsData.overview.activeDonors} Active Today
              </p>
            </CardBody>
          </Card>
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardBody className="p-5">
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-1">Network Hospitals</p>
              <h4 className="text-3xl font-bold text-slate-900">{analyticsData.overview.verifiedHospitals}</h4>
              <p className="text-xs font-semibold text-blue-600 mt-2 bg-blue-50 inline-block px-2 py-0.5 rounded">
                Verified Partners
              </p>
            </CardBody>
          </Card>
          <Card className="bg-white border-slate-200 shadow-sm border-t-4 border-t-blue-500">
            <CardBody className="p-5">
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-1">Open Requests</p>
              <h4 className="text-3xl font-bold text-slate-900">{analyticsData.overview.openRequests}</h4>
              <p className="text-xs font-bold text-red-600 mt-2 bg-red-50 inline-block px-2 py-0.5 rounded border border-red-100">
                {analyticsData.overview.criticalRequests} Critical
              </p>
            </CardBody>
          </Card>
          <Card className="bg-white border-slate-200 shadow-sm border-t-4 border-t-green-500">
            <CardBody className="p-5">
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-1">Total Fulfilled</p>
              <h4 className="text-3xl font-bold text-slate-900">{analyticsData.overview.totalUnitsFulfilled}</h4>
              <p className="text-xs font-semibold text-slate-600 mt-2 bg-slate-50 inline-block px-2 py-0.5 rounded">
                {analyticsData.overview.overallFulfillmentRate}% Success Rate
              </p>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Action Required: Hospital Verification Section */}
      <div className="space-y-4 pt-4" id="action-required">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          {hospitals.length > 0 && <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>}
          Action Required: Hospital Verifications
        </h2>
        
        {hospitals.length === 0 ? (
          <Card className="bg-slate-50 border-slate-200 shadow-none">
            <CardBody className="text-center py-10">
              <div className="w-12 h-12 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900">All caught up</h3>
              <p className="text-slate-500 mt-1">There are no pending hospital verifications right now.</p>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-4">
            {hospitals.map(hospital => (
              <Card key={hospital._id} className="border-yellow-300 shadow-sm hover:shadow-md transition-shadow">
                <div className="bg-yellow-50 px-5 py-2 border-b border-yellow-200 flex justify-between items-center">
                  <span className="text-xs font-bold text-yellow-800 uppercase tracking-wider">Pending Review</span>
                  <span className="text-xs text-yellow-700 font-medium">Applied: {new Date(hospital.createdAt).toLocaleDateString()}</span>
                </div>
                <CardBody className="p-5">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-white border-2 border-slate-200 rounded-lg flex items-center justify-center font-bold text-slate-400 text-xl shrink-0">
                        H
                      </div>
                      <div>
                        <h3 className="font-bold text-xl text-slate-900">{hospital.name}</h3>
                        <p className="text-slate-600 font-medium">{hospital.city}, {hospital.postalCode}</p>
                        <div className="mt-3 bg-slate-50 p-3 rounded border border-slate-100 inline-block">
                          <p className="text-xs text-slate-500 font-bold uppercase tracking-wide mb-1">Administrator Details</p>
                          <p className="text-sm font-medium text-slate-800">
                            {hospital.adminId?.firstName} {hospital.adminId?.lastName}
                          </p>
                          <p className="text-sm text-slate-600">
                            {hospital.adminId?.email} • {hospital.adminId?.phone}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                      <Button 
                        variant="outline" 
                        className="flex-1 md:flex-none border-red-200 text-red-700 hover:bg-red-50 font-bold"
                        onClick={() => setRejectDialogState({ isOpen: true, hospitalId: hospital._id })}
                        disabled={processingId === hospital._id}
                      >
                        Reject
                      </Button>
                      <Button 
                        variant="primary" 
                        className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 shadow-sm font-bold"
                        onClick={() => handleVerification(hospital._id, 'VERIFIED')}
                        disabled={processingId === hospital._id}
                      >
                        {processingId === hospital._id ? 'Processing...' : 'Approve & Verify'}
                      </Button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Analytics Section */}
      <div className="pt-8 border-t border-slate-200" id="analytics">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Analytics & Insights</h2>
          
          <div className="flex items-center gap-3 bg-white p-2 px-3 rounded-lg border border-slate-300 shadow-sm">
            <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            <select 
              className="text-sm border-0 focus:ring-0 text-slate-700 font-bold cursor-pointer bg-transparent outline-none"
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'all') {
                  setDateRange({ startDate: '', endDate: '' });
                } else {
                  const start = new Date();
                  start.setDate(start.getDate() - parseInt(val));
                  setDateRange({ startDate: start.toISOString(), endDate: new Date().toISOString() });
                }
              }}
            >
              <option value="all">All Time History</option>
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
            </select>
          </div>
        </div>

        {/* Analytics Charts */}
        {analyticsData.overview && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Blood Group Demand */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="bg-slate-50 border-b border-slate-100">
                <CardTitle className="text-lg">Blood Group Demand</CardTitle>
              </CardHeader>
              <CardBody className="h-80 pt-6">
                {analyticsData.bloodGroups.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.bloodGroups}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="bloodGroup" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontWeight: 600}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                      <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                      <Legend wrapperStyle={{paddingTop: '20px'}} />
                      <Bar dataKey="unitsRequested" name="Requested" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="unitsFulfilled" name="Fulfilled" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400 font-medium">No data available</div>
                )}
              </CardBody>
            </Card>

            {/* Time Trends */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="bg-slate-50 border-b border-slate-100">
                <CardTitle className="text-lg">Activity Trends</CardTitle>
              </CardHeader>
              <CardBody className="h-80 pt-6">
                {analyticsData.trends.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analyticsData.trends}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false}
                        tick={{fill: '#64748b', fontSize: 12}}
                        tickFormatter={(val) => {
                          const d = new Date(val);
                          return `${d.getMonth()+1}/${d.getDate()}`;
                        }}
                      />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                      <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                      <Legend wrapperStyle={{paddingTop: '20px'}} />
                      <Line type="monotone" dataKey="totalRequests" name="Total Requests" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, fill: '#3b82f6', strokeWidth: 0}} activeDot={{r: 6}} />
                      <Line type="monotone" dataKey="urgentCriticalRequests" name="Urgent/Critical" stroke="#ef4444" strokeWidth={3} dot={{r: 4, fill: '#ef4444', strokeWidth: 0}} />
                      <Line type="monotone" dataKey="completedDonations" name="Completed Donations" stroke="#10b981" strokeWidth={3} dot={{r: 4, fill: '#10b981', strokeWidth: 0}} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400 font-medium">No data available</div>
                )}
              </CardBody>
            </Card>

            {/* Request Status */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="bg-slate-50 border-b border-slate-100">
                <CardTitle className="text-lg">Request Status Breakdown</CardTitle>
              </CardHeader>
              <CardBody className="h-80 flex justify-center items-center">
                {analyticsData.status.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analyticsData.status}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={95}
                        paddingAngle={5}
                        dataKey="count"
                        nameKey="status"
                        stroke="none"
                      >
                        {analyticsData.status.map((entry, index) => {
                          let color = '#94a3b8'; // default
                          if (entry.status === 'OPEN' || entry.status === 'MATCHING') color = '#3b82f6';
                          else if (entry.status === 'PARTIALLY_FULFILLED') color = '#f59e0b';
                          else if (entry.status === 'FULFILLED') color = '#10b981';
                          else if (entry.status === 'CANCELLED') color = '#cbd5e1';
                          else if (entry.status === 'EXPIRED') color = '#ef4444';
                          return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                      </Pie>
                      <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 'bold'}} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400 font-medium">No data available</div>
                )}
              </CardBody>
            </Card>

            {/* Performance & Locations */}
            <div className="space-y-8">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="bg-slate-50 border-b border-slate-100">
                  <CardTitle className="text-lg">Network Efficiency</CardTitle>
                </CardHeader>
                <CardBody>
                  {analyticsData.performance ? (
                    <div className="space-y-5">
                      <div className="flex justify-between items-center pb-1">
                        <span className="text-sm font-semibold text-slate-600">Request to Match Response</span>
                        <span className="font-bold text-lg text-slate-900 bg-slate-100 px-3 py-1 rounded">
                          {analyticsData.performance.avgRequestToAcceptanceMinutes 
                            ? `${analyticsData.performance.avgRequestToAcceptanceMinutes}m` 
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pb-1 border-t border-slate-100 pt-4">
                        <span className="text-sm font-semibold text-slate-600">Match to Completion (Donation)</span>
                        <span className="font-bold text-lg text-slate-900 bg-slate-100 px-3 py-1 rounded">
                          {analyticsData.performance.avgAcceptanceToCompletionMinutes 
                            ? `${analyticsData.performance.avgAcceptanceToCompletionMinutes}m` 
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pb-1 border-t border-slate-100 pt-4">
                        <span className="text-sm font-semibold text-slate-600">Cancellation Rate</span>
                        <span className="font-bold text-lg text-amber-600 bg-amber-50 px-3 py-1 rounded">{analyticsData.performance.cancellationRate}%</span>
                      </div>
                      <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                        <span className="text-sm font-semibold text-slate-600">Request Expiration Rate</span>
                        <span className="font-bold text-lg text-red-600 bg-red-50 px-3 py-1 rounded">{analyticsData.performance.expirationRate}%</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-slate-400 py-6 font-medium">No performance data</div>
                  )}
                </CardBody>
              </Card>

              <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50 border-b border-slate-100">
                  <CardTitle className="text-lg">Top Cities by Demand</CardTitle>
                </CardHeader>
                <div className="p-0">
                  {analyticsData.locations.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="px-5 py-3 font-bold">City</th>
                            <th className="px-5 py-3 font-bold text-right">Open Requests</th>
                            <th className="px-5 py-3 font-bold text-right">Units Needed</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {analyticsData.locations.slice(0, 5).map((loc, idx) => (
                            <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                              <td className="px-5 py-4 font-bold text-slate-900 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                {loc.city}
                              </td>
                              <td className="px-5 py-4 text-right font-medium text-slate-600">{loc.requests}</td>
                              <td className="px-5 py-4 text-right font-bold text-red-600">{loc.unitsRequested}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center text-slate-400 py-10 font-medium">No location data available</div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>

      <ConfirmationDialog
        isOpen={rejectDialogState.isOpen}
        title="Reject Hospital Registration"
        message="Are you sure you want to reject this hospital? This action is permanent and they will not be able to join the BloodLink network."
        confirmLabel="Reject Hospital"
        onConfirm={() => {
          handleVerification(rejectDialogState.hospitalId, 'REJECTED');
          setRejectDialogState({ isOpen: false, hospitalId: null });
        }}
        onCancel={() => setRejectDialogState({ isOpen: false, hospitalId: null })}
      />
    </div>
  );
};

export default AdminDashboard;
