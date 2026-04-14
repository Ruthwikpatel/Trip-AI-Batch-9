import axios from 'axios';

async function runTests() {
  console.log("Starting API Flow Tests...");

  try {
    // 1. Fetch all trips to ensure the endpoint works
    console.log("\\n--- Testing GET /api/trips ---");
    const tripsRes = await axios.get('http://localhost:3000/api/trips');
    console.log(`Success: Fetched ${tripsRes.data.length} trips.`);

    // If we have an API key, we can test the full flow.
    // If not, we'll just test the endpoints that don't require Gemini.
    let tripId = '';
    
    // Mock the API key for testing purposes if it's not set
    const apiKeyToUse = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' 
      ? process.env.GEMINI_API_KEY 
      : 'MOCK_KEY';

    if (apiKeyToUse === 'MOCK_KEY') {
      console.log("\\n--- Testing POST /api/plan-trip (MOCKED) ---");
      // We can't actually test the endpoint without a real key, so we'll insert a mock trip directly into the DB
      // Wait, we can't do that from the test script easily.
      // Let's just skip the plan-trip test if we don't have a real key.
    }

    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY') {
      console.log("\\n--- Testing POST /api/plan-trip ---");
      const planRes = await axios.post('http://localhost:3000/api/plan-trip', {
        origin: 'New York',
        destination: 'London',
        days: 3,
        budget: 5000,
        people: 2,
        interests: ['Food', 'Culture'],
        transport: 'flight'
      });
      tripId = planRes.data.id;
      console.log(`Success: Planned trip with ID ${tripId}`);
    } else if (tripsRes.data.length > 0) {
      tripId = tripsRes.data[0].id;
      console.log(`\\nUsing existing trip ID ${tripId} for further tests since GEMINI_API_KEY is not set.`);
    } else {
      console.log("\\nSkipping further tests because no trips exist and GEMINI_API_KEY is not set.");
      return;
    }

    // 2. Fetch specific trip
    console.log(`\\n--- Testing GET /api/trips/${tripId} ---`);
    const tripRes = await axios.get(`http://localhost:3000/api/trips/${tripId}`);
    console.log(`Success: Fetched trip to ${tripRes.data.destination}`);

    // 3. Add an expense
    console.log(`\\n--- Testing POST /api/trips/${tripId}/expenses ---`);
    const expenseRes = await axios.post(`http://localhost:3000/api/trips/${tripId}/expenses`, {
      description: 'Dinner',
      amount: 150,
      paid_by: 'You',
      split_among: ['You', 'Friend 1']
    });
    console.log(`Success: Added expense with ID ${expenseRes.data.id}`);

    // 4. Fetch expenses
    console.log(`\\n--- Testing GET /api/trips/${tripId}/expenses ---`);
    const expensesRes = await axios.get(`http://localhost:3000/api/trips/${tripId}/expenses`);
    console.log(`Success: Fetched ${expensesRes.data.length} expenses.`);

    // 5. Add a booking
    console.log(`\\n--- Testing POST /api/trips/${tripId}/book ---`);
    const bookingRes = await axios.post(`http://localhost:3000/api/trips/${tripId}/book`, {
      type: 'hotel',
      details: { name: 'The Ritz', checkIn: '2:00 PM', checkOut: '11:00 AM' }
    });
    console.log(`Success: Added booking with ID ${bookingRes.data.id}`);

    // 6. Fetch bookings
    console.log(`\\n--- Testing GET /api/trips/${tripId}/bookings ---`);
    const bookingsRes = await axios.get(`http://localhost:3000/api/trips/${tripId}/bookings`);
    console.log(`Success: Fetched ${bookingsRes.data.length} bookings.`);

    console.log("\\n✅ All tests passed successfully!");

  } catch (error: any) {
    console.error("\\n❌ Test failed:");
    console.error(error.response?.data || error.message);
  }
}

runTests();
