import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getMyBands, buyEnergy } from '../lib/db';
import { BandCard } from '../components/BandCard';
import type { Band } from '../lib/db';

export function DashboardPage() {
  const { label, refreshLabel } = useAuth();
  const [bands, setBands] = useState<Band[]>([]);
  const [loading, setLoading] = useState(true);

  const handleBuyEnergy = async () => {
    if (!label) return;
    try {
      await buyEnergy(label.id, 1);
      await refreshLabel();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!label) return;
    refreshLabel();
    getMyBands(label.id)
      .then(setBands)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [label?.id]);

  if (!label) return null;

  const submitted = bands.filter((b) => b.is_submitted);
  const drafts = bands.filter((b) => !b.is_submitted);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-xl font-bold">{label.name}</h1>
        <p className="text-xs text-gray-400 mt-0.5">
          {label.specialty?.replace('_', ' ') || 'All genres'} &middot;{' '}
          {label.energy} energy &middot; {label.royalties} royalties
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <Link
          to="/submit"
          className="border border-gray-200 rounded-xl p-4 text-center hover:border-gray-300 transition-colors"
        >
          <p className="text-2xl mb-1">+</p>
          <p className="text-xs font-medium text-gray-600">Submit a band</p>
          <p className="text-[10px] text-gray-400">{label.energy} energy left</p>
        </Link>
        {label.energy === 0 && label.royalties >= 10 ? (
          <button
            onClick={handleBuyEnergy}
            className="border border-violet-200 rounded-xl p-4 text-center hover:border-violet-300 transition-colors bg-violet-50"
          >
            <p className="text-2xl mb-1">&#x21C4;</p>
            <p className="text-xs font-medium text-violet-700">Buy energy</p>
            <p className="text-[10px] text-violet-500">10 royalties = 1 energy</p>
          </button>
        ) : (
          <Link
            to="/review"
            className="border border-gray-200 rounded-xl p-4 text-center hover:border-gray-300 transition-colors"
          >
            <p className="text-2xl mb-1">&#9654;</p>
            <p className="text-xs font-medium text-gray-600">Review bands</p>
            <p className="text-[10px] text-gray-400">+5 royalties each</p>
          </Link>
        )}
      </div>

      {/* Bands */}
      {loading ? (
        <p className="text-xs text-gray-400">Loading...</p>
      ) : bands.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm mb-2">No bands yet.</p>
          <Link to="/submit" className="text-violet-600 text-sm hover:underline">
            Submit your first band &rarr;
          </Link>
        </div>
      ) : (
        <>
          {submitted.length > 0 && (
            <div className="mb-6">
              <h2 className="text-[11px] text-gray-400 uppercase tracking-wider mb-2">
                Live ({submitted.length})
              </h2>
              <div className="space-y-2">
                {submitted.map((b) => <BandCard key={b.id} band={b} />)}
              </div>
            </div>
          )}
          {drafts.length > 0 && (
            <div>
              <h2 className="text-[11px] text-gray-400 uppercase tracking-wider mb-2">
                Drafts ({drafts.length})
              </h2>
              <div className="space-y-2">
                {drafts.map((b) => <BandCard key={b.id} band={b} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
