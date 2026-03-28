import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getReviewQueue, submitReview } from '../lib/db';
import { BandCard } from '../components/BandCard';
import type { Band } from '../lib/db';

export function ReviewPage() {
  const { label, refreshLabel } = useAuth();
  const [queue, setQueue] = useState<Band[]>([]);
  const [idx, setIdx] = useState(0);
  const [rating, setRating] = useState(5);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [flash, setFlash] = useState('');

  const load = useCallback(async () => {
    if (!label) return;
    setLoading(true);
    try {
      const q = await getReviewQueue(label.id);
      setQueue(q);
      setIdx(0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [label?.id]);

  useEffect(() => { load(); }, [load]);

  const current = queue[idx] ?? null;

  const handleSubmit = async () => {
    if (!current || !label) return;
    setSubmitting(true);
    setFlash('');
    try {
      await submitReview(current.id, label.id, rating, notes);
      await refreshLabel();
      setFlash('+5 royalties');
      setNotes('');
      setRating(5);

      setTimeout(() => {
        setFlash('');
        if (idx + 1 < queue.length) {
          setIdx((i) => i + 1);
        } else {
          load();
        }
      }, 1000);
    } catch (err: any) {
      const msg = err.message || 'Review failed';
      if (msg.includes('duplicate') || msg.includes('unique')) {
        setFlash('Already reviewed');
        setTimeout(() => {
          setFlash('');
          setIdx((i) => i + 1);
        }, 800);
      } else {
        setFlash(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    if (idx + 1 < queue.length) {
      setIdx((i) => i + 1);
      setRating(5);
      setNotes('');
    } else {
      load();
    }
  };

  if (!label) return null;

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-xl font-bold">Review queue</h1>
          <p className="text-xs text-gray-400">Listen. Rate. Earn 5 royalties per review.</p>
        </div>
        {queue.length > 0 && !loading && (
          <span className="text-[10px] text-gray-300">
            {idx + 1}/{queue.length}
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-gray-400 text-center py-12">Loading queue...</p>
      ) : !current ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-sm mb-3">Queue is empty.</p>
          <button onClick={load} className="text-violet-600 text-xs hover:underline">
            Refresh
          </button>
        </div>
      ) : (
        <>
          {/* The band */}
          <BandCard band={current} />

          {/* Rating interface */}
          <div className="mt-5 border border-gray-100 rounded-xl p-5 space-y-4">
            {/* Rating slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">Your rating</span>
                <span className="text-lg font-display font-bold">{rating}</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="w-full accent-violet-600"
              />
              <div className="flex justify-between text-[10px] text-gray-300 mt-1 px-0.5">
                <span>Pass</span><span>Decent</span><span>Banger</span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">A&R notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Production quality, hook, market fit..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-violet-200"
                maxLength={500}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 bg-gray-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {submitting ? '...' : 'Submit review'}
              </button>
              <button
                onClick={handleSkip}
                className="px-4 border border-gray-200 rounded-lg text-xs text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors"
              >
                Skip
              </button>
            </div>

            {/* Flash feedback */}
            {flash && (
              <p className={`text-center text-sm font-medium animate-pulse ${
                flash.startsWith('+') ? 'text-green-600' : 'text-red-500'
              }`}>
                {flash}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
