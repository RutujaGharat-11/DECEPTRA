'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { AppBrandHeader } from '@/components/app-brand-header';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      router.replace('/');
    }
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:5000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = (await response.json()) as {
        token?: string;
        user?: { full_name: string; email: string };
        error?: string;
      };

      if (!response.ok || !data.token || !data.user) {
        setError(data.error || 'Login failed');
        return;
      }

      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      router.replace('/');
    } catch {
      setError('Unable to reach server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-card border border-border rounded-lg p-6 sm:p-7 space-y-6">
        <AppBrandHeader />

        <div className="space-y-1 text-center">
          <h2 className="text-2xl font-bold text-foreground">Sign In</h2>
          <p className="text-muted-foreground text-sm">Access your Deception Risk Scanner dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          {error ? <p className="text-danger text-sm">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-blue-600 text-foreground font-semibold py-3 rounded-lg transition disabled:opacity-70"
          >
            {loading ? 'Signing In...' : 'Login'}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link href="/create-account" className="text-primary hover:text-blue-600 font-medium">
            Create Account
          </Link>
        </p>
      </div>
    </div>
  );
}
