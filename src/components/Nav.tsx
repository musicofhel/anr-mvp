import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { signOut } from '../lib/db';

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/submit', label: 'Submit' },
  { to: '/review', label: 'Review' },
  { to: '/leaderboard', label: 'Board' },
];

export function Nav() {
  const { label } = useAuth();

  return (
    <nav className="border-b border-gray-100 bg-white sticky top-0 z-50">
      <div className="max-w-2xl mx-auto px-4 flex items-center justify-between h-12">
        <div className="flex items-center gap-4">
          <NavLink to="/" className="font-display font-bold text-base tracking-tight">
            A&R
          </NavLink>
          <div className="flex items-center gap-0.5">
            {LINKS.map(({ to, label: text }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `px-2.5 py-1 rounded-md text-xs transition-colors ${
                    isActive ? 'bg-gray-100 font-medium text-gray-900' : 'text-gray-400 hover:text-gray-600'
                  }`
                }
              >
                {text}
              </NavLink>
            ))}
          </div>
        </div>

        {label && (
          <div className="flex items-center gap-3 text-[11px]">
            <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-medium">
              {label.energy} nrg
            </span>
            <span className="bg-violet-50 text-violet-700 px-2 py-0.5 rounded font-medium">
              {label.royalties} roy
            </span>
            <span className="text-gray-400 hidden sm:inline">{label.name}</span>
            <button
              onClick={() => signOut()}
              className="text-gray-300 hover:text-gray-500"
            >
              &times;
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
