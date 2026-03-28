import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { createBand, addTrack, submitBand, buyEnergy, GENRES } from '../lib/db';
import type { Genre } from '../lib/db';

export function SubmitPage() {
  const { label, refreshLabel } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [genre, setGenre] = useState<Genre | ''>('');
  const [sunoUrl, setSunoUrl] = useState('');
  const [trackTitles, setTrackTitles] = useState(['', '', '']);
  const [loading, setLoading] = useState(false);
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleBuyEnergy = async () => {
    if (!label) return;
    setBuying(true);
    setError('');
    try {
      await buyEnergy(label.id, 1);
      await refreshLabel();
    } catch (err: any) {
      setError(err.message || 'Failed to buy energy');
    } finally {
      setBuying(false);
    }
  };

  const updateTrack = (idx: number, val: string) => {
    const next = [...trackTitles];
    next[idx] = val;
    setTrackTitles(next);
  };

  const addTrackSlot = () => {
    if (trackTitles.length < 6) setTrackTitles([...trackTitles, '']);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label || !genre || !name) return;

    setError('');
    setLoading(true);

    try {
      // Create band (trigger deducts energy)
      const band = await createBand(label.id, name, genre, sunoUrl);

      // Add tracks
      const filledTracks = trackTitles.filter((t) => t.trim());
      for (let i = 0; i < filledTracks.length; i++) {
        await addTrack(band.id, filledTracks[i].trim(), i + 1);
      }

      // Submit to leaderboard
      await submitBand(band.id);
      refreshLabel(); // fire-and-forget, don't block redirect

      setSuccess(true);
      setTimeout(() => navigate('/'), 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to create band');
    } finally {
      setLoading(false);
    }
  };

  if (!label) return null;

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <h1 className="font-display text-xl font-bold mb-1">Submit a band</h1>
      <p className="text-xs text-gray-400 mb-6">
        Costs 1 energy. You have{' '}
        <span className="font-medium text-amber-700">{label.energy}</span>.
        {label.energy === 0 && label.royalties >= 10 && (
          <button
            onClick={handleBuyEnergy}
            disabled={buying}
            className="text-violet-600 ml-1 hover:underline"
          >
            {buying ? 'Buying...' : `Buy 1 energy (10 royalties — you have ${label.royalties})`}
          </button>
        )}
        {label.energy === 0 && label.royalties < 10 && (
          <span className="text-red-500 ml-1">
            Review bands to earn royalties (need 10 for 1 energy).
          </span>
        )}
      </p>

      {success ? (
        <div className="bg-green-50 text-green-700 rounded-lg p-4 text-sm text-center">
          Band submitted! Redirecting...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Band name */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Band name</label>
            <input
              type="text"
              placeholder="The Midnight Circuit"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200"
              required
              maxLength={60}
            />
          </div>

          {/* Genre */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Genre</label>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value as Genre)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-200"
              required
            >
              <option value="">Select genre</option>
              {GENRES.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </div>

          {/* Suno link */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">
              Suno link <span className="text-gray-300">(paste your share URL)</span>
            </label>
            <input
              type="url"
              placeholder="https://suno.com/song/..."
              value={sunoUrl}
              onChange={(e) => setSunoUrl(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200"
            />
          </div>

          {/* Track titles */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">
              Tracks <span className="text-gray-300">(optional)</span>
            </label>
            <div className="space-y-2">
              {trackTitles.map((title, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs text-gray-300 w-5 text-right">{idx + 1}.</span>
                  <input
                    type="text"
                    placeholder={`Track ${idx + 1} title`}
                    value={title}
                    onChange={(e) => updateTrack(idx, e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200"
                    maxLength={80}
                  />
                </div>
              ))}
            </div>
            {trackTitles.length < 6 && (
              <button
                type="button"
                onClick={addTrackSlot}
                className="text-xs text-gray-400 hover:text-gray-600 mt-2"
              >
                + Add track
              </button>
            )}
          </div>

          {error && <p className="text-red-500 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={loading || !genre || !name || label.energy < 1}
            className="w-full bg-gray-900 text-white rounded-lg py-3 text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-30"
          >
            {loading ? 'Submitting...' : 'Submit band (1 energy)'}
          </button>
        </form>
      )}
    </div>
  );
}
