import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Plane, Map, CreditCard, Calendar, Bell } from 'lucide-react';
import { motion } from 'framer-motion';

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="flex items-center gap-2">
              <div className="bg-emerald-500 text-white p-2 rounded-xl">
                <Plane className="w-5 h-5" />
              </div>
              <span className="font-sans font-semibold text-xl tracking-tight text-neutral-900">
                Trip Autopilot
              </span>
            </Link>
            <nav className="hidden md:flex space-x-8">
              <Link to="/plan" className="text-neutral-600 hover:text-emerald-600 font-medium transition-colors">
                Plan Trip
              </Link>
              <button className="text-neutral-600 hover:text-emerald-600 transition-colors">
                <Bell className="w-5 h-5" />
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
