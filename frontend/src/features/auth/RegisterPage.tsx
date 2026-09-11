import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { Lock, Mail, User as UserIcon, Eye, EyeOff, ArrowRight, Layers } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setError(null);
      setIsSubmitting(true);
      await register({
        email: email.trim(),
        password,
        name: name.trim() || undefined,
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-black text-white mb-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Layers className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-bold uppercase tracking-wider text-black">
            Create System Account
          </h1>
          <p className="text-xs font-mono text-zinc-500 mt-1">
            Register to set up and manage your own isolated poultry flocks
          </p>
        </div>

        {/* Register Card */}
        <div className="panel p-6 sm:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white border border-black">
          {error && (
            <div className="mb-6 p-3 border border-black bg-zinc-100 text-xs font-mono text-black">
              <span className="font-bold">[ERROR]</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider mb-1.5 text-zinc-800">
                Full Name / Farm Manager
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono border border-black focus:outline-none focus:ring-1 focus:ring-black bg-white"
                  autoComplete="name"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider mb-1.5 text-zinc-800">
                Email Address <span className="text-black">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. user@farm.com"
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono border border-black focus:outline-none focus:ring-1 focus:ring-black bg-white"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider mb-1.5 text-zinc-800">
                Password <span className="text-black">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-9 pr-10 py-2 text-xs font-mono border border-black focus:outline-none focus:ring-1 focus:ring-black bg-white"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-black"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider mb-1.5 text-zinc-800">
                Confirm Password <span className="text-black">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono border border-black focus:outline-none focus:ring-1 focus:ring-black bg-white"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-black text-white text-xs font-bold uppercase tracking-wider border border-black hover:bg-zinc-800 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span>{isSubmitting ? 'Registering...' : 'Register Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          <div className="mt-6 text-center text-xs font-mono text-zinc-600">
            Already registered?{' '}
            <Link to="/login" className="font-bold text-black hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
