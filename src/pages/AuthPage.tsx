import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { signInWithMagicLink, createProfileAndLabel, GENRES } from '../lib/db';
import type { Genre } from '../lib/db';

export function AuthPage() {
  const { user, label } = useAuth();

  // State: not logged in → show magic link form
  // State: logged in but no label → show onboarding
  if (user && !label) return <Onboarding userId={user.id} />;
  return <MagicLink />;
}

// ── Magic Link ─────────────────────────────────────────────

function MagicLink() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithMagicLink(email);
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-xs text-center">
        <h1 className="font-display text-3xl font-bold mb-1">A&R</h1>
        <p className="text-sm text-gray-400 mb-8">Record label simulator</p>

        {sent ? (
          <div className="bg-green-50 text-green-700 rounded-lg p-4 text-sm">
            Check your email for the magic link.
          </div>
        ) : (
          <form onSubmit={handle} className="space-y-3">
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200"
              required
            />
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 text-white rounded-lg py-3 text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send magic link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Onboarding ─────────────────────────────────────────────

function Onboarding({ userId }: { userId: string }) {
  const { refreshLabel } = useAuth();
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [labelName, setLabelName] = useState('');
  const [specialty, setSpecialty] = useState<Genre | ''>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFinish = async () => {
    setError('');
    setLoading(true);
    try {
      await createProfileAndLabel(
        userId,
        username,
        labelName,
        specialty || undefined,
      );
      await refreshLabel();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-xs">
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-2 text-center">
          Step {step} of 2
        </p>

        {step === 1 ? (
          <>
            <h2 className="font-display text-xl font-bold text-center mb-1">Who are you?</h2>
            <p className="text-xs text-gray-400 text-center mb-6">Pick a username. This is public.</p>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 mb-3"
              minLength={3}
              maxLength={24}
            />
            <button
              onClick={() => username.length >= 3 && setStep(2)}
              disabled={username.length < 3}
              className="w-full bg-gray-900 text-white rounded-lg py-3 text-sm font-medium disabled:opacity-30"
            >
              Next
            </button>
          </>
        ) : (
          <>
            <h2 className="font-display text-xl font-bold text-center mb-1">Name your label</h2>
            <p className="text-xs text-gray-400 text-center mb-6">This is your brand. Choose wisely.</p>
            <input
              type="text"
              placeholder="Label name"
              value={labelName}
              onChange={(e) => setLabelName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 mb-3"
              minLength={2}
              maxLength={32}
            />
            <select
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value as Genre | '')}
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-200 mb-3"
            >
              <option value="">All genres (no specialty)</option>
              {GENRES.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
            {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
            <button
              onClick={handleFinish}
              disabled={labelName.length < 2 || loading}
              className="w-full bg-gray-900 text-white rounded-lg py-3 text-sm font-medium disabled:opacity-30"
            >
              {loading ? 'Creating...' : 'Launch label'}
            </button>
            <button
              onClick={() => setStep(1)}
              className="w-full text-gray-400 text-xs mt-3 hover:text-gray-600"
            >
              Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}
