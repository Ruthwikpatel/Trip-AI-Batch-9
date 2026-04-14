import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plane, Map, CreditCard, Calendar, Mic, Sparkles } from 'lucide-react';

export function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="bg-emerald-100 text-emerald-600 p-4 rounded-full inline-block mb-6">
          <Plane className="w-12 h-12" />
        </div>
        <h1 className="text-5xl md:text-7xl font-sans font-bold tracking-tight text-neutral-900 mb-6">
          Your Personal <br />
          <span className="text-emerald-600">AI Travel Agent</span>
        </h1>
        <p className="text-lg md:text-xl text-neutral-600 max-w-2xl mx-auto mb-10">
          Plan, optimize, and simulate booking your dream trips in seconds. 
          Just tell us where you want to go, and we'll handle the rest.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/plan"
            className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-medium text-lg hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            Start Planning
          </Link>
          <button className="bg-white text-neutral-700 border border-neutral-200 px-8 py-4 rounded-2xl font-medium text-lg hover:bg-neutral-50 transition-colors flex items-center justify-center gap-2">
            <Mic className="w-5 h-5" />
            Use Voice
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 w-full max-w-5xl">
        <FeatureCard
          icon={<Map className="w-6 h-6 text-blue-500" />}
          title="Smart Itineraries"
          description="AI-generated day-by-day plans tailored to your interests and budget."
        />
        <FeatureCard
          icon={<CreditCard className="w-6 h-6 text-amber-500" />}
          title="Expense Splitting"
          description="Traveling with friends? Easily track and split expenses automatically."
        />
        <FeatureCard
          icon={<Calendar className="w-6 h-6 text-purple-500" />}
          title="Auto Booking"
          description="Simulate booking flights, hotels, and activities with a single click."
        />
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100 text-left hover:shadow-md transition-shadow">
      <div className="bg-neutral-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-neutral-900 mb-2">{title}</h3>
      <p className="text-neutral-600">{description}</p>
    </div>
  );
}
