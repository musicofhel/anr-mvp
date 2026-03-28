import { useState, useEffect, useCallback } from 'react';
import { getLeaderboard, GENRES } from '../lib/db';
import { BandCard } from '../components/BandCard';
import type { Band, Genre } from '../lib/db';

const PER_PAGE = 20;

export function LeaderboardPage() {
  const [genre, setGenre] = useState<Genre | ''>('');
  const [bands, setBands] = useState<Band[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getLeaderboard(page, PER_PAGE, genre || undefined);
      setBands(res.bands);
      setTotal(res.count);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [genre, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [genre]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-xl font-bold">Leaderboard</h1>
          <p className="text-xs text-gray-400">Ranked by average rating</p>
        </div>
        <select
          value={genre}
          onChange={(e) => setGenre(e.target.value as Genre | '')}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-violet-200"
        >
          <option value="">All genres</option>
          {GENRES.map((g) => (
            <option key={g.value} value={g.value}>{g.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-xs text-gray-400 text-center py-12">Loading...</p>
      ) : bands.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-16">
          No bands on the board yet.
        </p>
      ) : (
        <>
          <div className="space-y-2">
            {bands.map((band, i) => (
              <BandCard
                key={band.id}
                band={band}
                rank={(page - 1) * PER_PAGE + i + 1}
                right={
                  <div className="text-right">
                    <p className="text-base font-semibold text-violet-600">
                      {Number(band.avg_rating).toFixed(1)}
                    </p>
                    <p className="text-[10px] text-gray-400">{band.review_count} rev</p>
                  </div>
                }
              />
            ))}
          </div>

          {total > PER_PAGE && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30"
              >
                &larr; Prev
              </button>
              <span className="text-[10px] text-gray-400">
                {page}/{Math.ceil(total / PER_PAGE)}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page * PER_PAGE >= total}
                className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30"
              >
                Next &rarr;
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
