import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useLogin, useForceChangePassword } from '../api/hooks';
import { useAuth } from '../context/AuthContext';
import { MapPin, AlertCircle, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const loginMutation = useLogin();
  const changePasswordMutation = useForceChangePassword();
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [mustChange, setMustChange] = useState(false);
  const [tempCredentials, setTempCredentials] = useState(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const {
    register: registerChange,
    handleSubmit: handleSubmitChange,
    formState: { errors: changeErrors, isSubmitting: isChanging },
  } = useForm();

  const onLoginSubmit = async (data) => {
    setError('');
    try {
      const res = await loginMutation.mutateAsync(data);
      if (res.data.must_change_password) {
        // Store the temporary credentials and show the change form
        setTempCredentials(data);
        setMustChange(true);
        setError('');
      } else {
        login(res.data.access, res.data.refresh, res.data.user);
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials and try again.');
    }
  };

  const onChangePasswordSubmit = async (data) => {
    setError('');
    try {
      const res = await changePasswordMutation.mutateAsync({
        old_password: tempCredentials.password,
        new_password: data.new_password,
      });
      // Password changed — log in with the new tokens
      login(res.data.access, res.data.refresh, null);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password. Please try again.');
    }
  };

  const isLoading = isSubmitting || loginMutation.isPending;
  const isChangingPassword = isChanging || changePasswordMutation.isPending;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-green-50/30 to-emerald-50/40 px-4 py-8">
      <div className="w-full max-w-[400px] animate-fade-in-up">
        {/* Logo & Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-white mb-5 shadow-lg shadow-green-500/25">
            <MapPin className="h-8 w-8" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">CVO Dispersal System</h1>
          <p className="text-sm text-slate-500 mt-1.5 max-w-xs mx-auto">
            Geo-Tagging of Livestock and Poultry Dispersal
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-black/[0.04] border border-slate-200/60 p-7">
          <h2 className="text-lg font-semibold text-slate-900 mb-5">
            {mustChange ? (
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-amber-500" />
                Set Your Password
              </span>
            ) : (
              'Welcome back'
            )}
          </h2>

          {mustChange && (
            <div className="flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-200/60 rounded-xl mb-5 text-amber-700 text-sm animate-fade-in">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>
                You must set a new password before continuing. Your temporary
                password will no longer work after this.
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200/60 rounded-xl mb-5 text-red-700 text-sm animate-fade-in" role="alert">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {!mustChange ? (
            <form onSubmit={handleSubmit(onLoginSubmit)} className="space-y-4" noValidate>
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Username
                </label>
                <input
                  id="username"
                  {...register('username', { required: 'Username is required' })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-green-500/40 focus:border-green-500 outline-none transition-all duration-150"
                  placeholder="Enter your username"
                  autoComplete="username"
                  aria-invalid={errors.username ? 'true' : 'false'}
                  aria-describedby={errors.username ? 'username-error' : undefined}
                  disabled={isLoading}
                />
                {errors.username && (
                  <p id="username-error" className="text-red-500 text-xs mt-1.5" role="alert">{errors.username.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    {...register('password', { required: 'Password is required' })}
                    type={showPassword ? 'text' : 'password'}
                    className="w-full px-3.5 py-2.5 pr-10 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-green-500/40 focus:border-green-500 outline-none transition-all duration-150"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    aria-invalid={errors.password ? 'true' : 'false'}
                    aria-describedby={errors.password ? 'password-error' : undefined}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p id="password-error" className="text-red-500 text-xs mt-1.5" role="alert">{errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium rounded-xl shadow-md shadow-green-600/20 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmitChange(onChangePasswordSubmit)} className="space-y-4" noValidate>
              <div>
                <label htmlFor="new_password" className="block text-sm font-medium text-slate-700 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="new_password"
                    {...registerChange('new_password', {
                      required: 'New password is required',
                      minLength: { value: 8, message: 'Password must be at least 8 characters' },
                    })}
                    type={showNewPassword ? 'text' : 'password'}
                    className="w-full px-3.5 py-2.5 pr-10 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-green-500/40 focus:border-green-500 outline-none transition-all duration-150"
                    placeholder="Choose a strong password"
                    autoComplete="new-password"
                    disabled={isChangingPassword}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
                    tabIndex={-1}
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {changeErrors.new_password && (
                  <p className="text-red-500 text-xs mt-1.5" role="alert">{changeErrors.new_password.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isChangingPassword}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium rounded-xl shadow-md shadow-amber-500/20 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Setting password...
                  </>
                ) : (
                  'Set New Password & Continue'
                )}
              </button>
            </form>
          )}

          {!mustChange && (
            <div className="mt-5 pt-4 border-t border-slate-100">
              <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                Contact your administrator for login credentials.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-slate-400 mt-6">
          CVO Livestock Dispersal System · Geo-Tagging Platform
        </p>
      </div>
    </div>
  );
}
