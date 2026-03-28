import type { Band } from '../lib/db';

interface Props {
  band: Band;
  rank?: number;
  right?: React.ReactNode;
  children?: React.ReactNode;
}

export function BandCard({ band, rank, right, children }: Props) {
  const genreLabel = band.genre.replace(/_/g, ' ');

  return (
    <div className="border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors">
      <div className="flex items-start gap-3">
        {rank !== undefined && (
          <span className="text-base font-semibold text-gray-200 w-6 text-right shrink-0 pt-0.5">
            {rank}
          </span>
        )}

        {/* Cover */}
        <div className="w-11 h-11 rounded-lg bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center text-[9px] text-gray-300 font-medium">
          {band.cover_url ? (
            <img src={band.cover_url} alt="" className="w-full h-full object-cover" />
          ) : (
            genreLabel.slice(0, 3).toUpperCase()
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm truncate">{band.name}</h3>
            {!band.is_submitted && (
              <span className="text-[9px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">draft</span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {genreLabel}
            {band.labels?.name && <> &middot; {band.labels.name}</>}
          </p>
          {(band.avg_rating > 0 || band.review_count > 0) && (
            <div className="flex gap-3 mt-1.5 text-xs text-gray-400">
              {band.avg_rating > 0 && (
                <span><span className="font-medium text-gray-600">{Number(band.avg_rating).toFixed(1)}</span> avg</span>
              )}
              {band.review_count > 0 && <span>{band.review_count} reviews</span>}
            </div>
          )}
        </div>

        {right && <div className="shrink-0">{right}</div>}
      </div>

      {/* Suno link */}
      {band.suno_url && (
        <a
          href={band.suno_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 block text-xs text-violet-500 hover:text-violet-700 truncate"
        >
          Listen on Suno &rarr;
        </a>
      )}

      {children}
    </div>
  );
}
