import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Plane, Hotel, Map, Loader2, Calendar, Clock, XCircle, Receipt, Printer, X } from 'lucide-react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { io } from 'socket.io-client';

export function BookingSummary() {
  const { id } = useParams();
  const [trip, setTrip] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [refundMessage, setRefundMessage] = useState<string | null>(null);

  useEffect(() => {
    const socket = io();

    if (id) {
      socket.emit('join_trip', id);

      socket.on('booking_added', (booking) => {
        setBookings((prev) => {
          if (prev.find(b => b.id === booking.id)) return prev;
          return [booking, ...prev];
        });
      });

      socket.on('booking_updated', (updatedBooking) => {
        setBookings((prev) => prev.map(b => b.id === updatedBooking.id ? updatedBooking : b));
      });

      socket.on('trip_updated', (updatedTrip) => {
        setTrip(updatedTrip);
      });
    }

    return () => {
      socket.disconnect();
    };
  }, [id]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tripRes, bookingsRes] = await Promise.all([
          axios.get(`/api/trips/${id}`),
          axios.get(`/api/trips/${id}/bookings`)
        ]);
        setTrip(tripRes.data);
        setBookings(bookingsRes.data);
      } catch (error) {
        console.error('Failed to fetch data', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) fetchData();
  }, [id]);

  const handleAutoBook = async () => {
    setIsBooking(true);
    try {
      const res = await axios.post(`/api/trips/${id}/auto-book`);
      
      setBookings(prev => {
        let newBookings = [...prev];
        for (const b of res.data) {
          if (!newBookings.find(existing => existing.id === b.id)) {
            newBookings = [b, ...newBookings];
          }
        }
        return newBookings;
      });

    } catch (error) {
      console.error('Failed to auto book', error);
    } finally {
      setIsBooking(false);
    }
  };

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    try {
      const response = await axios.patch(`/api/trips/${id}/bookings/${bookingId}/status`, { status: newStatus });
      setBookings(prev => prev.map(b => b.id === bookingId ? response.data.booking : b));
      
      if (response.data.refundAmount > 0) {
        setRefundMessage(`Refund of ₹${response.data.refundAmount} processed successfully! Budget has been dynamically reallocated.`);
        setTimeout(() => setRefundMessage(null), 5000);
      }
      
      if (response.data.trip) {
        setTrip(response.data.trip);
      }
    } catch (error) {
      console.error('Failed to update status', error);
    }
  };

  if (isLoading) return <div className="text-center mt-20">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      {refundMessage && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-3 shadow-sm"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <p className="font-medium text-sm">{refundMessage}</p>
        </motion.div>
      )}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={`/trip/${id}`} className="p-2 bg-white rounded-full shadow-sm hover:bg-neutral-50 transition-colors">
            <ArrowLeft className="w-5 h-5 text-neutral-600" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Auto Booking Agent</h1>
            <p className="text-neutral-500">Simulate bookings for {trip?.destination}</p>
          </div>
        </div>
        <button
          onClick={handleAutoBook}
          disabled={isBooking || bookings.length > 0}
          className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
        >
          {isBooking ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Booking...</>
          ) : bookings.length > 0 ? (
            <><CheckCircle2 className="w-5 h-5" /> All Booked</>
          ) : (
            <><Plane className="w-5 h-5" /> Auto Book All</>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {bookings.length === 0 && !isBooking ? (
          <div className="bg-white rounded-3xl shadow-sm border border-neutral-200 p-12 text-center">
            <div className="bg-emerald-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">Ready to Book?</h2>
            <p className="text-neutral-600 max-w-md mx-auto mb-6">
              Click the "Auto Book All" button to let our AI agent simulate booking your flights, hotels, and activities.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {bookings.map((booking, index) => (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.2 }}
                className="bg-white rounded-3xl shadow-sm border border-neutral-200 p-6 flex items-start gap-6"
              >
                <div className={`p-4 rounded-2xl ${
                  booking.type === 'flight' ? 'bg-blue-50 text-blue-600' :
                  booking.type === 'hotel' ? 'bg-amber-50 text-amber-600' :
                  'bg-purple-50 text-purple-600'
                }`}>
                  {booking.type === 'flight' && <Plane className="w-8 h-8" />}
                  {booking.type === 'hotel' && <Hotel className="w-8 h-8" />}
                  {booking.type === 'activity' && <Map className="w-8 h-8" />}
                </div>
                
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-neutral-900 capitalize">{booking.type} Booking</h3>
                      <p className="text-neutral-500 text-sm">ID: {booking.id.split('-')[0].toUpperCase()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={booking.status}
                        onChange={(e) => handleStatusChange(booking.id, e.target.value)}
                        className={`px-3 py-1.5 rounded-full text-sm font-semibold appearance-none cursor-pointer border-0 outline-none pr-8 bg-no-repeat bg-[right_0.5rem_center] bg-[length:1em_1em] ${
                          booking.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-700 bg-[url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23047857%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")]' :
                          booking.status === 'Pending' ? 'bg-amber-100 text-amber-700 bg-[url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23b45309%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")]' :
                          'bg-red-100 text-red-700 bg-[url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23b91c1c%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")]'
                        }`}
                      >
                        <option value="Confirmed">Confirmed</option>
                        <option value="Pending">Pending</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                      {booking.status === 'Confirmed' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                      {booking.status === 'Pending' && <Clock className="w-5 h-5 text-amber-600" />}
                      {booking.status === 'Cancelled' && <XCircle className="w-5 h-5 text-red-600" />}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                    {Object.entries(booking.details).map(([key, value]: any) => (
                      <div key={key}>
                        <p className="text-xs text-neutral-500 uppercase tracking-wider font-medium mb-1">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                        <p className="font-semibold text-neutral-900">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t border-neutral-100 flex justify-end gap-3">
                    {booking.status !== 'Cancelled' && (
                      <button
                        onClick={() => handleStatusChange(booking.id, 'Cancelled')}
                        className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg transition-colors"
                      >
                        <XCircle className="w-4 h-4" /> Cancel & Refund
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedReceipt(booking)}
                      className="flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-lg transition-colors"
                    >
                      <Receipt className="w-4 h-4" /> View Receipt
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {selectedReceipt && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-sm w-full shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
            {/* Receipt Header */}
            <div className="bg-neutral-900 text-white p-6 text-center relative">
              <button 
                onClick={() => setSelectedReceipt(null)}
                className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <Receipt className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
              <h2 className="text-xl font-bold tracking-widest uppercase">E-Receipt</h2>
              <p className="text-neutral-400 text-xs mt-1 font-mono">TRIP PLANNER INC.</p>
            </div>

            {/* Receipt Body */}
            <div className="p-6 overflow-y-auto font-mono text-sm bg-[#fdfdfd]">
              <div className="text-center mb-6">
                <p className="text-neutral-500 text-xs mb-1">BOOKING ID</p>
                <p className="font-bold text-neutral-900 tracking-wider">{selectedReceipt.id.split('-')[0].toUpperCase()}</p>
              </div>

              <div className="border-b-2 border-dashed border-neutral-200 pb-4 mb-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-neutral-500">TYPE</span>
                  <span className="font-bold capitalize">{selectedReceipt.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">DESTINATION</span>
                  <span className="font-bold text-right">{trip?.destination}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">STATUS</span>
                  <span className="font-bold">{selectedReceipt.status}</span>
                </div>
              </div>

              <div className="border-b-2 border-dashed border-neutral-200 pb-4 mb-4 space-y-3">
                {Object.entries(selectedReceipt.details).map(([key, value]: any) => {
                  if (key.toLowerCase() === 'cost') return null; // Handle cost separately
                  return (
                    <div key={key} className="flex flex-col">
                      <span className="text-neutral-500 text-xs uppercase">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className="font-bold text-neutral-900">{value}</span>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between items-center text-lg">
                <span className="text-neutral-500 font-bold">TOTAL</span>
                <span className="font-bold text-emerald-600">{selectedReceipt.details.cost || 'Paid'}</span>
              </div>

              {/* Barcode Mock */}
              <div className="mt-8 text-center">
                <div className="h-12 w-full flex items-center justify-center gap-1 opacity-60">
                  {[...Array(30)].map((_, i) => (
                    <div key={i} className={`bg-neutral-800 h-full ${Math.random() > 0.5 ? 'w-1' : 'w-2'}`}></div>
                  ))}
                </div>
                <p className="text-[10px] text-neutral-400 mt-2 tracking-[0.2em]">{selectedReceipt.id.split('-').join('').toUpperCase()}</p>
              </div>
            </div>

            {/* Receipt Footer */}
            <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex gap-3">
              <button 
                onClick={() => window.print()}
                className="flex-1 bg-neutral-900 text-white py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-neutral-800 transition-colors"
              >
                <Printer className="w-4 h-4" /> Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
