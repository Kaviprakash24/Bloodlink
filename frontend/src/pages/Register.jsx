import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Card, CardBody, CardHeader, CardTitle } from '../components/ui/Card';

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'DONOR'
  });
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  // Parse role from query params if available (e.g. ?role=REQUESTER)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const roleParam = params.get('role');
    if (roleParam === 'DONOR' || roleParam === 'REQUESTER') {
      setFormData(prev => ({ ...prev, role: roleParam }));
    }
  }, [location]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.password || !formData.role) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: formData.role
      };
      
      await register(payload);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center py-12">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create an Account</CardTitle>
          <p className="text-sm text-slate-500 mt-2">Join BloodLink to help save lives</p>
        </CardHeader>
        <CardBody>
          {error && (
            <div className="mb-6 p-3 bg-red-50 text-sm text-red-600 rounded-lg border border-red-100">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role Selection */}
            <div className="pb-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">I am signing up as a:</label>
              <div className="grid grid-cols-2 gap-4">
                <label className={`
                  border rounded-lg p-3 flex text-center cursor-pointer justify-center transition-colors
                  ${formData.role === 'DONOR' ? 'bg-primary-light border-primary text-primary-dark font-semibold' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}
                `}>
                  <input
                    type="radio"
                    name="role"
                    value="DONOR"
                    checked={formData.role === 'DONOR'}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  Blood Donor
                </label>
                <label className={`
                  border rounded-lg p-3 flex text-center cursor-pointer justify-center transition-colors
                  ${formData.role === 'REQUESTER' ? 'bg-primary-light border-primary text-primary-dark font-semibold' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}
                `}>
                  <input
                    type="radio"
                    name="role"
                    value="REQUESTER"
                    checked={formData.role === 'REQUESTER'}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  Patient / Requester
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                name="firstName"
                id="firstName"
                placeholder="John"
                value={formData.firstName}
                onChange={handleChange}
                disabled={isLoading}
                required
              />
              <Input
                label="Last Name"
                name="lastName"
                id="lastName"
                placeholder="Doe"
                value={formData.lastName}
                onChange={handleChange}
                disabled={isLoading}
                required
              />
            </div>
            
            <Input
              label="Email Address"
              name="email"
              id="email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              disabled={isLoading}
              required
            />

            <Input
              label="Phone Number"
              name="phone"
              id="phone"
              type="tel"
              placeholder="e.g. 9876543210"
              value={formData.phone}
              onChange={handleChange}
              disabled={isLoading}
              required
            />
            
            <Input
              label="Password"
              name="password"
              id="password"
              type="password"
              placeholder="At least 6 characters"
              value={formData.password}
              onChange={handleChange}
              disabled={isLoading}
              required
            />

            <Input
              label="Confirm Password"
              name="confirmPassword"
              id="confirmPassword"
              type="password"
              placeholder="Repeat your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={isLoading}
              required
            />
            
            <Button type="submit" className="w-full mt-6" isLoading={isLoading}>
              Create Account
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-600">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-primary hover:text-primary-dark">
              Log in
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default Register;
