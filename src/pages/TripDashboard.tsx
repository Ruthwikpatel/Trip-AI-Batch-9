import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Plane, Map, CreditCard, Calendar, Loader2, MapPin, Clock, DollarSign, CheckCircle2, Users, ExternalLink, Train, Bus, Car, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { io } from 'socket.io-client';

export function TripDashboard() {
  const { id } = useParams();
  const [trip, setTrip] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('itinerary');
  const [aiWarning, setAiWarning] = useState<string | null>(null);
  const [isSelectingTransport, setIsSelectingTransport] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<{name: string, details: any} | null>(null);
  const [isLoadingPlace, setIsLoadingPlace] = useState(false);

  useEffect(() => {
    const socket = io();

    if (id) {
      socket.emit('join_trip', id);

      socket.on('trip_updated', (updatedTrip) => {
        setTrip(updatedTrip);
      });
    }

    return () => {
      socket.disconnect();
    };
  }, [id]);

  useEffect(() => {
    const fetchTrip = async () => {
      try {
        const response = await axios.get(`/api/trips/${id}`);
        setTrip(response.data);
      } catch (error) {
        console.error('Failed to fetch trip', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) fetchTrip();
  }, [id]);

  const handleSelectTransport = async (opt: any) => {
    setIsSelectingTransport(true);
    try {
      const res = await axios.post(`/api/trips/${id}/select-transport`, { mode: opt.mode, cost: opt.cost });
      if (res.data.status === 'exceeds_budget') {
        setAiWarning(res.data.message);
      } else {
        setTrip(res.data.trip);
        setAiWarning(null);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSelectingTransport(false);
    }
  };

  const handlePlaceClick = async (place: string) => {
    setSelectedPlace({ name: place, details: null });
    setIsLoadingPlace(true);
    try {
      const response = await axios.post('/api/places/details', {
        place,
        destination: trip.destination
      });
      setSelectedPlace({ name: place, details: response.data });
    } catch (error) {
      console.error('Failed to fetch place details', error);
      setSelectedPlace(null);
    } finally {
      setIsLoadingPlace(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!trip) {
    return <div className="text-center text-neutral-500 mt-20">Trip not found.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-3xl shadow-sm border border-neutral-200 overflow-hidden mb-8">
        <div className="bg-neutral-900 text-white p-8 md:p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
            <Plane className="w-96 h-96" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                {trip.origin && trip.origin !== 'Unknown' ? `${trip.origin} to ${trip.destination}` : trip.destination}
              </h1>
              <div className="flex flex-wrap gap-4 text-neutral-300 font-medium">
                <span className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                  <Calendar className="w-4 h-4" /> {trip.days} Days
                </span>
                <span className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                  <Users className="w-4 h-4" /> {trip.people} People
                </span>
                <span className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                  <DollarSign className="w-4 h-4" /> ₹{trip.budget} Budget
                </span>
                <span className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm capitalize">
                  <Plane className="w-4 h-4" /> {trip.transport}
                </span>
              </div>
            </div>
            <Link
              to={`/trip/${trip.id}/bookings`}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-colors shrink-0"
            >
              <CheckCircle2 className="w-5 h-5" />
              Auto Bookings
            </Link>
          </div>
        </div>

        <div className="border-b border-neutral-200 px-8">
          <nav className="flex gap-8">
            {['itinerary', 'costs', 'transport', 'places'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 font-medium text-sm capitalize transition-colors relative ${
                  activeTab === tab ? 'text-emerald-600' : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <motion.div layoutId="underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-8">
          {activeTab === 'itinerary' && (
            <div className="space-y-12">
              {trip.itinerary.itinerary.map((day: any) => (
                <div key={day.day} className="relative">
                  <h3 className="text-2xl font-bold text-neutral-900 mb-6 flex items-center gap-3">
                    <span className="bg-emerald-100 text-emerald-700 w-10 h-10 rounded-xl flex items-center justify-center text-lg">
                      {day.day}
                    </span>
                    Day {day.day}
                  </h3>
                  <div className="space-y-6 pl-5 border-l-2 border-neutral-100 ml-5">
                    {day.activities.map((activity: any, idx: number) => (
                      <div key={idx} className="relative">
                        <div className="absolute -left-[29px] top-1 w-4 h-4 rounded-full bg-white border-2 border-emerald-500" />
                        <div className="bg-neutral-50 rounded-2xl p-6 border border-neutral-100">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-sm font-semibold text-emerald-600 flex items-center gap-2">
                              <Clock className="w-4 h-4" /> {activity.time}
                            </span>
                            <span className="text-sm font-medium text-neutral-500 flex items-center gap-1">
                              <DollarSign className="w-4 h-4" /> ₹{activity.cost}
                            </span>
                          </div>
                          <p className="text-neutral-800 font-medium text-lg">{activity.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'costs' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-neutral-50 rounded-3xl p-8 border border-neutral-100">
                  <h3 className="text-xl font-bold text-neutral-900 mb-6">Estimated Breakdown</h3>
                  <div className="space-y-4">
                    {Object.entries(trip.itinerary.estimatedCosts).map(([key, value]: any) => (
                      key !== 'total' && (
                        <div key={key} className="flex justify-between items-center pb-4 border-b border-neutral-200 last:border-0">
                          <span className="capitalize text-neutral-600 font-medium">{key}</span>
                          <span className="font-semibold text-neutral-900">₹{value}</span>
                        </div>
                      )
                    ))}
                    <div className="pt-4 mt-4 border-t-2 border-neutral-900 flex justify-between items-center">
                      <span className="font-bold text-xl text-neutral-900">Total</span>
                      <span className="font-bold text-2xl text-emerald-600">₹{trip.itinerary.estimatedCosts.total}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-4">
                  <Link
                    to={`/trip/${trip.id}/expenses`}
                    className="bg-white border border-neutral-200 p-6 rounded-3xl hover:border-emerald-500 hover:shadow-md transition-all group flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-bold text-lg text-neutral-900 mb-1 group-hover:text-emerald-600 transition-colors">Split Expenses</h4>
                      <p className="text-neutral-500 text-sm">Track who paid what and settle up.</p>
                    </div>
                    <div className="bg-neutral-100 p-3 rounded-full group-hover:bg-emerald-50 transition-colors">
                      <CreditCard className="w-6 h-6 text-neutral-600 group-hover:text-emerald-600" />
                    </div>
                  </Link>
                  <Link
                    to={`/trip/${trip.id}/bookings`}
                    className="bg-white border border-neutral-200 p-6 rounded-3xl hover:border-emerald-500 hover:shadow-md transition-all group flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-bold text-lg text-neutral-900 mb-1 group-hover:text-emerald-600 transition-colors">Auto Bookings</h4>
                      <p className="text-neutral-500 text-sm">Simulate booking flights and hotels.</p>
                    </div>
                    <div className="bg-neutral-100 p-3 rounded-full group-hover:bg-emerald-50 transition-colors">
                      <CheckCircle2 className="w-6 h-6 text-neutral-600 group-hover:text-emerald-600" />
                    </div>
                  </Link>
                </div>
              </div>

              {trip.itinerary.budgetSavingTips && trip.itinerary.budgetSavingTips.length > 0 && (
                <div className="bg-emerald-50 rounded-3xl p-8 border border-emerald-100">
                  <h3 className="text-xl font-bold text-emerald-900 mb-6 flex items-center gap-2">
                    <DollarSign className="w-6 h-6" /> Budget Saving Tips
                  </h3>
                  <ul className="space-y-4">
                    {trip.itinerary.budgetSavingTips.map((tip: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-3 text-emerald-800">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                        <span className="font-medium leading-relaxed">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeTab === 'transport' && trip.itinerary.transportOptions && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-neutral-900 mb-6">Transport Options</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {trip.itinerary.transportOptions.map((opt: any, idx: number) => (
                  <div key={idx} className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-emerald-50 text-emerald-600 p-3 rounded-2xl">
                        {opt.mode.toLowerCase().includes('flight') ? <Plane className="w-6 h-6" /> : 
                         opt.mode.toLowerCase().includes('train') ? <Train className="w-6 h-6" /> :
                         opt.mode.toLowerCase().includes('bus') ? <Bus className="w-6 h-6" /> :
                         opt.mode.toLowerCase().includes('car') ? <Car className="w-6 h-6" /> :
                         <Map className="w-6 h-6" />}
                      </div>
                      <div className="text-right">
                        <span className="block font-bold text-xl text-emerald-600">₹{opt.cost}</span>
                        <span className="text-sm text-neutral-500 flex items-center gap-1 justify-end"><Clock className="w-3 h-3"/> {opt.duration}</span>
                      </div>
                    </div>
                    <h4 className="text-lg font-bold text-neutral-900 mb-2">{opt.mode}</h4>
                    <p className="text-neutral-600 text-sm leading-relaxed">{opt.recommendationReason}</p>
                    <div className="mt-4 pt-4 border-t border-neutral-100">
                      <button
                        onClick={() => handleSelectTransport(opt)}
                        disabled={isSelectingTransport || trip.itinerary.selectedTransport === opt.mode}
                        className={`w-full py-2 rounded-xl font-medium transition-colors ${
                          trip.itinerary.selectedTransport === opt.mode
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50'
                        }`}
                      >
                        {trip.itinerary.selectedTransport === opt.mode ? 'Selected' : 'Select Option'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'places' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {trip.itinerary.recommendedPlaces.map((place: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => handlePlaceClick(place)}
                  className="bg-neutral-50 rounded-2xl p-6 border border-neutral-100 flex items-start gap-4 hover:border-emerald-500 hover:shadow-md transition-all group cursor-pointer text-left w-full"
                >
                  <div className="bg-white p-3 rounded-xl shadow-sm group-hover:bg-emerald-50 transition-colors">
                    <MapPin className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div className="flex-1 mt-1">
                    <span className="font-semibold text-neutral-800 group-hover:text-emerald-700 transition-colors flex items-center gap-2">
                      {place}
                      <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedPlace && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-xl relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setSelectedPlace(null)}
              className="absolute top-6 right-6 text-neutral-400 hover:text-neutral-900 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            
            <h3 className="text-2xl font-bold text-neutral-900 mb-6 pr-8">{selectedPlace.name}</h3>
            
            {isLoadingPlace ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mb-4" />
                <p className="text-neutral-500 font-medium">Gathering details...</p>
              </div>
            ) : selectedPlace.details ? (
              <div className="space-y-6">
                <div>
                  <p className="text-neutral-700 leading-relaxed">{selectedPlace.details.description}</p>
                </div>
                
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                  <h4 className="font-bold text-emerald-900 mb-1 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Best Time to Visit
                  </h4>
                  <p className="text-emerald-800 text-sm">{selectedPlace.details.bestTime}</p>
                </div>
                
                <div>
                  <h4 className="font-bold text-neutral-900 mb-3">Highlights</h4>
                  <ul className="space-y-2">
                    {selectedPlace.details.highlights.map((highlight: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-neutral-700">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="pt-4 border-t border-neutral-100">
                  <a 
                    href={`https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(selectedPlace.name + ' ' + trip.destination)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-2 text-sm"
                  >
                    Read more on Wikipedia <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ) : (
              <p className="text-red-500">Failed to load details.</p>
            )}
          </div>
        </div>
      )}

      {aiWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4 text-amber-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-xl font-bold">Budget Alert</h3>
            </div>
            <p className="text-neutral-700 mb-6 leading-relaxed">{aiWarning}</p>
            <div className="flex gap-3">
              <button onClick={() => setAiWarning(null)} className="flex-1 py-3 rounded-xl font-medium bg-neutral-100 text-neutral-700 hover:bg-neutral-200">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


