import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, Loader2, Plane, Sparkles, MapPin, Users, Wallet, Calendar } from 'lucide-react';
import axios from 'axios';

export function TripPlanner() {
  const navigate = useNavigate();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    origin: '',
    destination: '',
    days: 3,
    budget: 10000,
    people: 2,
    interests: [] as string[],
    transport: 'auto'
  });

  const [previousOrigins, setPreviousOrigins] = useState<string[]>([]);
  const [previousDestinations, setPreviousDestinations] = useState<string[]>([]);

  const interestOptions = ['Food', 'Adventure', 'Nature', 'Nightlife', 'Culture', 'Relaxation'];

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window)) {
      console.warn('Speech recognition not supported');
    }

    const fetchPreviousTrips = async () => {
      try {
        const response = await axios.get('/api/trips');
        const trips = response.data;
        const origins = Array.from(new Set(trips.map((t: any) => t.origin).filter(Boolean))) as string[];
        const destinations = Array.from(new Set(trips.map((t: any) => t.destination).filter(Boolean))) as string[];
        setPreviousOrigins(origins);
        setPreviousDestinations(destinations);
      } catch (error) {
        console.error('Failed to fetch previous trips', error);
      }
    };

    fetchPreviousTrips();
  }, []);

  const toggleListen = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const result = event.results[current][0].transcript;
      setTranscript(result);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (transcript) {
        // Simple heuristic to extract info from voice
        const lower = transcript.toLowerCase();
        
        // Try to extract "from [origin] to [destination]"
        const fromToMatch = lower.match(/from\s+([a-z\s]+)\s+to\s+([a-z\s]+)/);
        if (fromToMatch) {
          setFormData(prev => ({ 
            ...prev, 
            origin: fromToMatch[1].trim().replace(/\b\w/g, l => l.toUpperCase()),
            destination: fromToMatch[2].trim().replace(/\b\w/g, l => l.toUpperCase())
          }));
        } else {
          if (lower.includes('goa')) setFormData(prev => ({ ...prev, destination: 'Goa' }));
          if (lower.includes('bali')) setFormData(prev => ({ ...prev, destination: 'Bali' }));
        }

        if (lower.includes('days')) {
          const match = lower.match(/(\d+)\s*days/);
          if (match) setFormData(prev => ({ ...prev, days: parseInt(match[1]) }));
        }
      }
    };

    recognition.start();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/plan-trip', formData);
      navigate(`/trip/${response.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate trip plan. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleInterest = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-neutral-900 mb-4 flex items-center justify-center gap-3">
          <Sparkles className="text-emerald-500 w-8 h-8" />
          Plan Your Next Adventure
        </h1>
        <p className="text-neutral-600 text-lg">
          Tell us your preferences, and our AI will craft the perfect itinerary.
        </p>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-neutral-200 p-8">
        <div className="mb-8 flex flex-col items-center">
          <button
            type="button"
            onClick={toggleListen}
            className={`p-6 rounded-full transition-all duration-300 ${
              isListening 
                ? 'bg-red-100 text-red-600 shadow-[0_0_30px_rgba(239,68,68,0.3)] animate-pulse' 
                : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
            }`}
          >
            {isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
          </button>
          <p className="mt-4 text-sm font-medium text-neutral-500">
            {isListening ? 'Listening...' : 'Tap to speak your request'}
          </p>
          {transcript && (
            <div className="mt-4 p-4 bg-neutral-50 rounded-xl text-neutral-700 italic border border-neutral-100 w-full text-center">
              "{transcript}"
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Starting Point
              </label>
              <input
                type="text"
                required
                list="origin-options"
                value={formData.origin}
                onChange={e => setFormData({ ...formData, origin: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                placeholder="e.g., New York, London, Mumbai"
              />
              <datalist id="origin-options">
                {previousOrigins.map((origin, idx) => (
                  <option key={idx} value={origin} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Destination
              </label>
              <input
                type="text"
                required
                list="destination-options"
                value={formData.destination}
                onChange={e => setFormData({ ...formData, destination: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                placeholder="e.g., Goa, Paris, Tokyo"
              />
              <datalist id="destination-options">
                {previousDestinations.map((dest, idx) => (
                  <option key={idx} value={dest} />
                ))}
              </datalist>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Duration (Days)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                required
                value={formData.days}
                onChange={e => setFormData({ ...formData, days: parseInt(e.target.value) })}
                className="w-full px-4 py-3 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2 flex items-center gap-2">
                <Wallet className="w-4 h-4" /> Total Budget (₹)
              </label>
              <input
                type="number"
                min="100"
                required
                value={formData.budget}
                onChange={e => setFormData({ ...formData, budget: parseInt(e.target.value) })}
                className="w-full px-4 py-3 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2 flex items-center gap-2">
                <Users className="w-4 h-4" /> Number of People
              </label>
              <input
                type="number"
                min="1"
                max="20"
                required
                value={formData.people}
                onChange={e => setFormData({ ...formData, people: parseInt(e.target.value) })}
                className="w-full px-4 py-3 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-3">Interests</label>
            <div className="flex flex-wrap gap-2">
              {interestOptions.map(interest => (
                <button
                  key={interest}
                  type="button"
                  onClick={() => toggleInterest(interest)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    formData.interests.includes(interest)
                      ? 'bg-emerald-600 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-3 flex items-center gap-2">
              <Plane className="w-4 h-4" /> Transport Mode
            </label>
            <div className="flex flex-wrap gap-3">
              {['flight', 'train', 'bus', 'car', 'bike', 'auto'].map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFormData({ ...formData, transport: mode })}
                  className={`flex-1 min-w-[100px] px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
                    formData.transport === mode
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                      : 'bg-white border-neutral-200 text-neutral-600 hover:border-emerald-300'
                  }`}
                >
                  {mode === 'auto' ? 'Auto (Best for Budget)' : mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="text-red-500 text-sm font-medium">{error}</div>}

          <button
            type="submit"
            disabled={isLoading || !formData.destination || !formData.origin}
            className="w-full bg-neutral-900 text-white py-4 rounded-xl font-medium text-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating Itinerary...
              </>
            ) : (
              'Generate Trip Plan'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
