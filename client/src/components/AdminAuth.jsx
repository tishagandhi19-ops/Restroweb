import React, { useState, useEffect } from 'react';
import {
  UtensilsCrossed,
  Mail,
  Lock,
  User,
  Building2,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import {
  registerAdminApi,
  loginAdminApi,
  getAdminProfileApi,
} from '../api/auth';
import AdminDashboard from './AdminDashboard';
import CustomerMenuView from './CustomerMenuView';

export default function AdminAuth({ onPreviewGuest: externalPreviewGuest } = {}) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Current Logged-in Admin state
  const [currentAdmin, setCurrentAdmin] = useState(null);

  // Guest dining view state (triggered by QR scan URL or admin preview)
  const [guestView, setGuestView] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const restaurantId = params.get('restaurantId');
    const table = params.get('table');
    if (restaurantId) {
      return { restaurantId, tableNumber: table || '1' };
    }
    return null;
  });

  // Form states
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  });

  const [registerForm, setRegisterForm] = useState({
    name: '',
    restaurantName: '',
    email: '',
    password: '',
  });

  // Check saved admin session on initial mount
  useEffect(() => {
    const savedToken = localStorage.getItem('restoweb_admin_token');
    const savedAdmin = localStorage.getItem('restoweb_admin_user');

    if (savedToken && savedAdmin) {
      try {
        const parsed = JSON.parse(savedAdmin);
        setCurrentAdmin(parsed);
        // Silently verify with backend
        getAdminProfileApi(savedToken)
          .then((res) => {
            if (res.data) {
              setCurrentAdmin(res.data);
              localStorage.setItem('restoweb_admin_user', JSON.stringify(res.data));
            }
          })
          .catch(() => {
            handleLogout();
          });
      } catch (err) {
        handleLogout();
      }
    }
  }, []);

  const clearMessages = () => {
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleModeSwitch = (newMode) => {
    setMode(newMode);
    clearMessages();
  };

  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    setLoginForm((prev) => ({ ...prev, [name]: value }));
    if (errorMsg) setErrorMsg('');
  };

  const handleRegisterChange = (e) => {
    const { name, value } = e.target;
    setRegisterForm((prev) => ({ ...prev, [name]: value }));
    if (errorMsg) setErrorMsg('');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    clearMessages();

    if (!loginForm.email.trim() || !loginForm.password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const response = await loginAdminApi({
        email: loginForm.email.trim(),
        password: loginForm.password,
      });

      localStorage.setItem('restoweb_admin_token', response.data.token);
      localStorage.setItem('restoweb_admin_user', JSON.stringify(response.data));
      setCurrentAdmin(response.data);
    } catch (err) {
      setErrorMsg(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    clearMessages();

    const { name, restaurantName, email, password } = registerForm;

    if (!name.trim() || !restaurantName.trim() || !email.trim() || !password) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const response = await registerAdminApi({
        name: name.trim(),
        restaurantName: restaurantName.trim(),
        email: email.trim(),
        password,
      });

      localStorage.setItem('restoweb_admin_token', response.data.token);
      localStorage.setItem('restoweb_admin_user', JSON.stringify(response.data));
      setCurrentAdmin(response.data);
    } catch (err) {
      setErrorMsg(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('restoweb_admin_token');
    localStorage.removeItem('restoweb_admin_user');
    setCurrentAdmin(null);
    clearMessages();
    setLoginForm({ email: '', password: '' });
  };

  // If a guest scanned a Table QR code, or admin is previewing customer view
  if (guestView) {
    return (
      <CustomerMenuView
        restaurantId={guestView.restaurantId}
        tableNumber={guestView.tableNumber}
        onBackToAdmin={() => {
          if (window.location.search) {
            window.history.pushState({}, '', window.location.pathname);
          }
          setGuestView(null);
        }}
      />
    );
  }

  // If Admin is logged in, show the comprehensive Admin Dashboard!
  if (currentAdmin) {
    return (
      <AdminDashboard
        admin={currentAdmin}
        onLogout={handleLogout}
        onPreviewGuest={(tableNumber) => {
          const newUrl = `${window.location.pathname}?restaurantId=${currentAdmin._id}&table=${encodeURIComponent(tableNumber)}`;
          window.history.pushState({}, '', newUrl);
          if (externalPreviewGuest) {
            externalPreviewGuest(currentAdmin._id, tableNumber);
          } else {
            setGuestView({
              restaurantId: currentAdmin._id,
              tableNumber,
            });
          }
        }}
      />
    );
  }

  // Otherwise, show the simple, clean, and professional Auth screen
  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        {/* Brand Header */}
        <div className="auth-brand">
          <div className="brand-icon">
            <UtensilsCrossed size={22} />
          </div>
          <span className="brand-name">RestoWeb</span>
        </div>

        <div className="auth-content">
          {/* Mode Switcher Tabs */}
          <div className="auth-tabs" role="tablist">
            <button
              type="button"
              id="tab-login"
              role="tab"
              aria-selected={mode === 'login'}
              className={`tab-btn ${mode === 'login' ? 'active' : ''}`}
              onClick={() => handleModeSwitch('login')}
            >
              Sign In
            </button>
            <button
              type="button"
              id="tab-register"
              role="tab"
              aria-selected={mode === 'register'}
              className={`tab-btn ${mode === 'register' ? 'active' : ''}`}
              onClick={() => handleModeSwitch('register')}
            >
              Register
            </button>
          </div>

          {/* Title & Subtitle */}
          <div className="auth-heading">
            <h1 className="auth-title">
              {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
            </h1>
            <p className="auth-subtitle">
              {mode === 'login'
                ? 'Enter your credentials to access your restaurant dashboard.'
                : 'Start managing your menus and dining tables in minutes.'}
            </p>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="auth-alert alert-error" role="alert">
              <AlertCircle size={18} className="alert-icon" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success Banner */}
          {successMsg && (
            <div className="auth-alert alert-success" role="status">
              <CheckCircle2 size={18} className="alert-icon" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Login Form */}
          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="auth-form" noValidate>
              <div className="form-group">
                <label htmlFor="login-email" className="form-label">
                  Email address
                </label>
                <div className="input-wrap">
                  <Mail size={18} className="input-icon" />
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="admin@restaurant.com"
                    value={loginForm.email}
                    onChange={handleLoginChange}
                    className="form-input"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="login-password" className="form-label">
                  Password
                </label>
                <div className="input-wrap">
                  <Lock size={18} className="input-icon" />
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={loginForm.password}
                    onChange={handleLoginChange}
                    className="form-input"
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                id="btn-login-submit"
                className="btn btn-primary btn-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="spinner" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <div className="form-footer">
                <span className="footer-text">Don't have an account?</span>{' '}
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => handleModeSwitch('register')}
                >
                  Register here
                </button>
              </div>
            </form>
          ) : (
            /* Register Form */
            <form onSubmit={handleRegisterSubmit} className="auth-form" noValidate>
              <div className="form-group">
                <label htmlFor="reg-name" className="form-label">
                  Full Name
                </label>
                <div className="input-wrap">
                  <User size={18} className="input-icon" />
                  <input
                    id="reg-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    placeholder="e.g. Jean Dupont"
                    value={registerForm.name}
                    onChange={handleRegisterChange}
                    className="form-input"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="reg-restaurant" className="form-label">
                  Restaurant Name
                </label>
                <div className="input-wrap">
                  <Building2 size={18} className="input-icon" />
                  <input
                    id="reg-restaurant"
                    name="restaurantName"
                    type="text"
                    placeholder="e.g. Le Palais Bistro"
                    value={registerForm.restaurantName}
                    onChange={handleRegisterChange}
                    className="form-input"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="reg-email" className="form-label">
                  Email address
                </label>
                <div className="input-wrap">
                  <Mail size={18} className="input-icon" />
                  <input
                    id="reg-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="admin@restaurant.com"
                    value={registerForm.email}
                    onChange={handleRegisterChange}
                    className="form-input"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="reg-password" className="form-label">
                  Password
                </label>
                <div className="input-wrap">
                  <Lock size={18} className="input-icon" />
                  <input
                    id="reg-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="At least 6 characters"
                    value={registerForm.password}
                    onChange={handleRegisterChange}
                    className="form-input"
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                id="btn-register-submit"
                className="btn btn-primary btn-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="spinner" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <div className="form-footer">
                <span className="footer-text">Already have an account?</span>{' '}
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => handleModeSwitch('login')}
                >
                  Sign in
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
