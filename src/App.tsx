/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { TripPlanner } from './pages/TripPlanner';
import { TripDashboard } from './pages/TripDashboard';
import { ExpenseSplit } from './pages/ExpenseSplit';
import { BookingSummary } from './pages/BookingSummary';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/plan" element={<TripPlanner />} />
          <Route path="/trip/:id" element={<TripDashboard />} />
          <Route path="/trip/:id/expenses" element={<ExpenseSplit />} />
          <Route path="/trip/:id/bookings" element={<BookingSummary />} />
        </Routes>
      </Layout>
    </Router>
  );
}
