import React, { useContext, useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import Button from '../ui/Button';
import NotificationBell from '../notifications/NotificationBell';

const Navbar = () => {
  const { user, logout, loading } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xl">
                B
              </div>
              <span className="font-bold text-xl text-slate-900 tracking-tight">BloodLink</span>
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            {!loading && (
              <>
                {user ? (
                  <>
                    <NotificationBell />
                    <div className="hidden sm:flex items-center gap-3 pl-6 ml-2 border-l border-slate-200">
                      <Link 
                        to={
                          user.role === 'ADMIN' ? '/admin-dashboard' :
                          user.role === 'HOSPITAL_ADMIN' ? '/hospital-dashboard' :
                          '/dashboard'
                        }
                        className="inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 bg-transparent text-slate-700 hover:bg-slate-100 focus:ring-slate-500 px-3 py-1.5 text-sm mr-2"
                      >
                        Dashboard
                      </Link>
                      <div className="relative" ref={dropdownRef}>
                        <button 
                          onClick={() => setIsProfileOpen(!isProfileOpen)}
                          className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-white hover:ring-slate-300 transition-all focus:outline-none cursor-pointer"
                        >
                          {(user.firstName?.[0] || user.name?.[0] || 'U').toUpperCase()}
                        </button>

                        {isProfileOpen && (
                          <div className="absolute right-0 mt-3 w-72 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50">
                            <div className="bg-slate-50 px-4 py-4 border-b border-slate-100 flex items-center gap-3">
                              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white font-bold text-lg shadow-sm">
                                {(user.firstName?.[0] || user.name?.[0] || 'U').toUpperCase()}
                              </div>
                              <div className="overflow-hidden">
                                <p className="text-sm font-bold text-slate-900 truncate">
                                  {user.firstName ? `${user.firstName} ${user.lastName || ''}` : user.name || 'User'}
                                </p>
                                <p className="text-xs text-slate-500 truncate">{user.email}</p>
                              </div>
                            </div>
                            
                            <div className="px-4 py-3 border-b border-slate-100 bg-white">
                              <div className="mb-2">
                                <span className="text-[10px] font-bold tracking-wider uppercase text-primary bg-red-50 px-2 py-0.5 rounded-full inline-block">
                                  {user.role ? user.role.replace('_', ' ') : 'USER'}
                                </span>
                              </div>
                              <div className="space-y-1.5 mt-2">
                                {user.phone && (
                                  <p className="text-xs text-slate-600 flex items-center gap-2">
                                    <span className="text-slate-400">📞</span> {user.phone}
                                  </p>
                                )}
                                {user.bloodGroup && (
                                  <p className="text-xs text-slate-600 flex items-center gap-2">
                                    <span className="text-slate-400">🩸</span> Blood Group: <span className="text-primary font-bold ml-1">{user.bloodGroup}</span>
                                  </p>
                                )}
                                <p className="text-xs text-slate-600 flex items-center gap-2">
                                  <span className="text-slate-400">✅</span> Status: Active
                                </p>
                              </div>
                            </div>

                            <div className="p-2 bg-slate-50">
                              <button 
                                onClick={handleLogout}
                                className="w-full text-left px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                                Sign Out
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                  </>
                ) : (
                  <>
                    <Link to="/login">
                      <Button variant="ghost" size="sm">Login</Button>
                    </Link>
                    <Link to="/register">
                      <Button variant="primary" size="sm">Get Started</Button>
                    </Link>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
