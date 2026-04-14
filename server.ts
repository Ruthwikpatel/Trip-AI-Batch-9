import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import { createServer } from "http";
import { Server } from "socket.io";

// Initialize database
const db = new Database("trip_autopilot.db");

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS trips (
    id TEXT PRIMARY KEY,
    origin TEXT,
    destination TEXT,
    days INTEGER,
    budget INTEGER,
    people INTEGER,
    interests TEXT,
    transport TEXT,
    itinerary TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    trip_id TEXT,
    description TEXT,
    amount REAL,
    paid_by TEXT,
    split_among TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(trip_id) REFERENCES trips(id)
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    trip_id TEXT,
    type TEXT,
    details TEXT,
    status TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(trip_id) REFERENCES trips(id)
  );
`);

try {
  db.exec("ALTER TABLE trips ADD COLUMN origin TEXT");
} catch (e) {
  // Column might already exist
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  app.use(express.json());

  // Socket.io connection handling
  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("join_trip", (tripId) => {
      socket.join(`trip_${tripId}`);
      console.log(`User ${socket.id} joined trip ${tripId}`);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  // API Routes
  app.post("/api/plan-trip", async (req, res) => {
    try {
      const { origin, destination, days, budget, people, interests, transport } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      let tripData;

      const fallbackTripData = {
        itinerary: [
          {
            day: 1,
            activities: [
              { time: "10:00 AM", description: `Arrive in ${destination} via ${transport} and check into hotel`, cost: 1200 },
              { time: "01:00 PM", description: "Lunch at a highly-rated local restaurant", cost: 800 },
              { time: "03:00 PM", description: "Guided City sightseeing tour", cost: 1500 }
            ],
            places: ["City Center", "Main Square"],
            foodSuggestions: ["Local Cafe", "Street Food Market"]
          },
          {
            day: 2,
            activities: [
              { time: "09:00 AM", description: "Visit famous historical landmarks", cost: 500 },
              { time: "02:00 PM", description: "Shopping and exploration in the main district", cost: 2000 },
              { time: "07:00 PM", description: "Dinner with a scenic view", cost: 1800 }
            ],
            places: ["Historic Monument", "Shopping District"],
            foodSuggestions: ["Fine Dining Restaurant"]
          }
        ],
        estimatedCosts: {
          transport: 4500,
          hotel: 6000,
          food: 3500,
          activities: 2000,
          total: 16000
        },
        recommendedPlaces: [`${destination} National Museum`, `${destination} Botanical Gardens`, "Old Town Heritage Walk"],
        budgetSavingTips: [
          "Use local public transport instead of private cabs to save on daily commute.",
          "Try authentic street food which is often cheaper and more flavorful than tourist-trap restaurants.",
          "Look for free walking tours or city passes that bundle attraction tickets."
        ],
        transportOptions: [
          { mode: "Flight", cost: 4500, duration: "2 hours", recommendationReason: "Fastest option, fits the budget if booked in advance." },
          { mode: "Train", cost: 1500, duration: "12 hours", recommendationReason: "Most budget-friendly, scenic route but takes longer." },
          { mode: "Bus", cost: 1200, duration: "14 hours", recommendationReason: "Cheapest alternative, good for overnight travel to save on hotel." }
        ]
      };

      if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "TODO_KEYHERE") {
        console.log("No API key found, using mock data for demonstration.");
        tripData = fallbackTripData;
      } else {
        try {
          const ai = new GoogleGenAI({ apiKey });
          const prompt = `Plan a ${days}-day trip from ${origin || 'anywhere'} to ${destination} for ${people} people.
          Budget: ₹${budget} (total).
          Interests: ${interests.join(", ")}.
          Transport preference: ${transport === 'auto' ? 'Recommend the best mode based on the budget' : transport}.
          
          Generate a detailed day-wise itinerary, estimated costs breakdown, and recommended places.
          CRITICAL: Ensure all costs are highly realistic for the specific destination and origin, reflecting current market rates for transport, food, hotels, and activities.
          CRITICAL BUDGET CONSTRAINT: The total estimated cost MUST BE STRICTLY LESS THAN OR EQUAL TO the user's budget of ₹${budget}. If realistic costs exceed ₹${budget}, you MUST aggressively re-allocate the budget. Adjust the itinerary by selecting cheaper transport, budget accommodations, or free/low-cost activities so that the total estimated cost is strictly under ₹${budget}. NEVER exceed ₹${budget}.
          Also, provide a list of 'budgetSavingTips' offering diverse, creative, and highly specific alternative ways the user can further minimize their budget for this specific trip.
          Finally, provide 'transportOptions' comparing 2-3 realistic modes of transport for this route with their estimated costs and durations, highlighting which one fits the budget best.`;

          const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  itinerary: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        day: { type: Type.INTEGER },
                        activities: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              time: { type: Type.STRING },
                              description: { type: Type.STRING },
                              cost: { type: Type.NUMBER }
                            }
                          }
                        },
                        places: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING }
                        },
                        foodSuggestions: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING }
                        }
                      }
                    }
                  },
                  estimatedCosts: {
                    type: Type.OBJECT,
                    properties: {
                      transport: { type: Type.NUMBER },
                      hotel: { type: Type.NUMBER },
                      food: { type: Type.NUMBER },
                      activities: { type: Type.NUMBER },
                      total: { type: Type.NUMBER }
                    }
                  },
                  recommendedPlaces: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  budgetSavingTips: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  transportOptions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        mode: { type: Type.STRING },
                        cost: { type: Type.NUMBER },
                        duration: { type: Type.STRING },
                        recommendationReason: { type: Type.STRING }
                      }
                    }
                  }
                },
                required: ["itinerary", "estimatedCosts", "recommendedPlaces", "budgetSavingTips", "transportOptions"]
              }
            }
          });

          console.log("Raw AI Response:", response.text);
          
          let jsonStr = response.text || "";
          jsonStr = jsonStr.trim();
          if (jsonStr.startsWith("```json")) {
            jsonStr = jsonStr.substring(7);
          } else if (jsonStr.startsWith("```")) {
            jsonStr = jsonStr.substring(3);
          }
          if (jsonStr.endsWith("```")) {
            jsonStr = jsonStr.substring(0, jsonStr.length - 3);
          }
          jsonStr = jsonStr.trim();

          tripData = JSON.parse(jsonStr);
        } catch (aiError) {
          console.error("AI API failed, using fallback:", aiError);
          tripData = fallbackTripData;
        }
      }

      const tripId = uuidv4();

      const insertTrip = db.prepare(`
        INSERT INTO trips (id, origin, destination, days, budget, people, interests, transport, itinerary)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertTrip.run(
        tripId,
        origin || 'Unknown',
        destination,
        days,
        budget,
        people,
        JSON.stringify(interests),
        transport,
        JSON.stringify(tripData)
      );

      res.json({ id: tripId, ...tripData });
    } catch (error: any) {
      console.error("Error planning trip:", error);
      
      if (error.status === 400 && error.message?.includes("API key not valid")) {
        return res.status(400).json({ error: "Invalid Gemini API key. Please check your Secrets panel." });
      }
      
      res.status(500).json({ error: "Failed to plan trip", details: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/trips/:id", (req, res) => {
    try {
      const trip = db.prepare("SELECT * FROM trips WHERE id = ?").get(req.params.id) as any;
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }
      trip.interests = JSON.parse(trip.interests);
      trip.itinerary = JSON.parse(trip.itinerary);
      res.json(trip);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trip" });
    }
  });

  app.get("/api/trips", (req, res) => {
    try {
      const trips = db.prepare("SELECT * FROM trips ORDER BY created_at DESC").all() as any[];
      const parsedTrips = trips.map(t => ({
        ...t,
        interests: JSON.parse(t.interests),
        itinerary: JSON.parse(t.itinerary)
      }));
      res.json(parsedTrips);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trips" });
    }
  });

  app.post("/api/trips/:id/select-transport", async (req, res) => {
    try {
      const { mode, cost } = req.body;
      const trip = db.prepare("SELECT * FROM trips WHERE id = ?").get(req.params.id) as any;
      if (!trip) return res.status(404).json({ error: "Trip not found" });

      const itinerary = JSON.parse(trip.itinerary);
      const remaining = trip.budget - cost;
      
      // Calculate minimum required budget for hotel and food (e.g., 800 INR per person per day)
      const minRequired = trip.days * trip.people * 800;

      if (remaining < minRequired) {
        // Call AI to generate a warning message
        const apiKey = process.env.GEMINI_API_KEY;
        let aiMessage = `Choosing ${mode} leaves only ₹${remaining} for accommodation and food, which is insufficient for ${trip.people} people over ${trip.days} days. Please remove some activities, reduce the number of days, or increase your budget to maintain a realistic trip.`;
        
        if (apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey !== "TODO_KEYHERE") {
          try {
            const ai = new GoogleGenAI({ apiKey });
            const prompt = `The user wants to choose ${mode} transport for ₹${cost}, but their total budget is ₹${trip.budget} for ${trip.people} people over ${trip.days} days. This leaves only ₹${remaining} for everything else (hotel, food, activities). Act as an AI travel assistant. Tell the user this choice makes them exceed realistic budget limits and ask them what they want to remove or change (e.g., reduce days, remove paid activities, choose cheaper accommodation) to maintain the budget. Keep it short, helpful, and conversational.`;
            const response = await ai.models.generateContent({
              model: "gemini-3-flash-preview",
              contents: prompt
            });
            if (response.text) aiMessage = response.text;
          } catch (e) {
            console.error("AI warning generation failed", e);
          }
        }

        return res.json({ status: 'exceeds_budget', message: aiMessage });
      }

      // Dynamically allocate remaining budget
      const hotelAlloc = Math.floor(remaining * 0.5);
      const foodAlloc = Math.floor(remaining * 0.3);
      const activitiesAlloc = remaining - hotelAlloc - foodAlloc;

      itinerary.estimatedCosts = {
        transport: cost,
        hotel: hotelAlloc,
        food: foodAlloc,
        activities: activitiesAlloc,
        total: trip.budget
      };
      itinerary.selectedTransport = mode;

      db.prepare("UPDATE trips SET itinerary = ? WHERE id = ?").run(JSON.stringify(itinerary), req.params.id);

      const updatedTrip = {
        ...trip,
        interests: JSON.parse(trip.interests),
        itinerary
      };

      io.to(`trip_${req.params.id}`).emit("trip_updated", updatedTrip);

      res.json({ status: 'success', trip: updatedTrip });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update transport" });
    }
  });

  app.post("/api/trips/:id/expenses", (req, res) => {
    try {
      const { description, amount, paid_by, split_among } = req.body;
      const expenseId = uuidv4();
      
      const insertExpense = db.prepare(`
        INSERT INTO expenses (id, trip_id, description, amount, paid_by, split_among)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      insertExpense.run(
        expenseId,
        req.params.id,
        description,
        amount,
        paid_by,
        JSON.stringify(split_among)
      );

      const newExpense = { id: expenseId, description, amount, paid_by, split_among };
      io.to(`trip_${req.params.id}`).emit("expense_added", newExpense);
      res.json(newExpense);
    } catch (error) {
      res.status(500).json({ error: "Failed to add expense" });
    }
  });

  app.get("/api/trips/:id/expenses", (req, res) => {
    try {
      const expenses = db.prepare("SELECT * FROM expenses WHERE trip_id = ? ORDER BY created_at DESC").all(req.params.id) as any[];
      const parsedExpenses = expenses.map(e => ({
        ...e,
        split_among: JSON.parse(e.split_among)
      }));
      res.json(parsedExpenses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch expenses" });
    }
  });

  app.post("/api/trips/:id/auto-book", async (req, res) => {
    try {
      const trip = db.prepare("SELECT * FROM trips WHERE id = ?").get(req.params.id) as any;
      if (!trip) return res.status(404).json({ error: "Trip not found" });

      const itinerary = JSON.parse(trip.itinerary);
      const apiKey = process.env.GEMINI_API_KEY;
      
      let bookingsToCreate = [];
      
      let exactTransportSelection = itinerary.selectedTransport || trip.transport || 'flight';
      let transportType = exactTransportSelection.toLowerCase();
      if (transportType.includes('flight')) transportType = 'flight';
      else if (transportType.includes('train')) transportType = 'train';
      else if (transportType.includes('bus')) transportType = 'bus';
      else if (transportType.includes('car')) transportType = 'car';
      else transportType = 'flight';

      if (apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey !== "TODO_KEYHERE") {
        try {
          const ai = new GoogleGenAI({ apiKey });
          const prompt = `Generate realistic booking details for a trip to ${trip.destination} for ${trip.days} days. 
          The user has explicitly selected "${exactTransportSelection}" as their transport mode.
          The budget allocations are: Transport: ₹${itinerary.estimatedCosts?.transport || 'auto'}, Hotel: ₹${itinerary.estimatedCosts?.hotel || 'auto'}, Activities: ₹${itinerary.estimatedCosts?.activities || 'auto'}.
          Generate 3 bookings that fit these budgets: 1 for the selected transport (${transportType}), 1 for hotel, and 1 for a main activity.
          For the transport booking, ensure the provider matches "${exactTransportSelection}".
          Return ONLY a valid JSON array of objects with this structure:
          [
            { "type": "${transportType}", "details": { "provider": "...", "identifier": "...", "departure": "...", "arrival": "...", "cost": "₹..." } },
            { "type": "hotel", "details": { "name": "...", "checkIn": "...", "checkOut": "...", "roomType": "...", "cost": "₹..." } },
            { "type": "activity", "details": { "name": "...", "date": "...", "time": "...", "provider": "...", "cost": "₹..." } }
          ]`;
          
          const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
              responseMimeType: "application/json",
            }
          });
          
          if (response.text) {
            bookingsToCreate = JSON.parse(response.text);
          }
        } catch (e) {
          console.error("AI booking generation failed", e);
        }
      }

      // Fallback if AI fails
      if (bookingsToCreate.length === 0) {
        bookingsToCreate = [
          { type: transportType, details: { provider: exactTransportSelection, identifier: 'TR-101', departure: '10:00 AM', arrival: '12:30 PM', cost: `₹${itinerary.estimatedCosts?.transport || 5000}` } },
          { type: 'hotel', details: { name: 'Grand Resort', checkIn: '2:00 PM', checkOut: '11:00 AM', roomType: 'Deluxe Suite', cost: `₹${itinerary.estimatedCosts?.hotel || 10000}` } },
          { type: 'activity', details: { name: 'City Tour', date: 'Day 2', time: '9:00 AM', provider: 'Local Guides Inc.', cost: `₹${itinerary.estimatedCosts?.activities || 2000}` } }
        ];
      }

      const createdBookings = [];
      const insertBooking = db.prepare(`
        INSERT INTO bookings (id, trip_id, type, details, status)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (const b of bookingsToCreate) {
        const bookingId = uuidv4();
        insertBooking.run(
          bookingId,
          req.params.id,
          b.type,
          JSON.stringify(b.details),
          "Confirmed"
        );
        const newBooking = { id: bookingId, type: b.type, details: b.details, status: "Confirmed" };
        io.to(`trip_${req.params.id}`).emit("booking_added", newBooking);
        createdBookings.push(newBooking);
      }

      res.json(createdBookings);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to auto book" });
    }
  });

  app.post("/api/trips/:id/book", async (req, res) => {
    try {
      const { type, details } = req.body;
      const bookingId = uuidv4();
      
      // Simulate booking delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      const insertBooking = db.prepare(`
        INSERT INTO bookings (id, trip_id, type, details, status)
        VALUES (?, ?, ?, ?, ?)
      `);

      insertBooking.run(
        bookingId,
        req.params.id,
        type,
        JSON.stringify(details),
        "Confirmed"
      );

      const newBooking = { id: bookingId, type, details, status: "Confirmed" };
      io.to(`trip_${req.params.id}`).emit("booking_added", newBooking);

      res.json(newBooking);
    } catch (error) {
      res.status(500).json({ error: "Failed to book" });
    }
  });

  app.get("/api/trips/:id/bookings", (req, res) => {
    try {
      const bookings = db.prepare("SELECT * FROM bookings WHERE trip_id = ? ORDER BY created_at DESC").all(req.params.id) as any[];
      const parsedBookings = bookings.map(b => ({
        ...b,
        details: JSON.parse(b.details)
      }));
      res.json(parsedBookings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bookings" });
    }
  });

  app.patch("/api/trips/:id/bookings/:bookingId/status", (req, res) => {
    try {
      const { status } = req.body;
      const { id, bookingId } = req.params;

      if (!['Confirmed', 'Pending', 'Cancelled'].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      // Get current booking
      const booking = db.prepare("SELECT * FROM bookings WHERE id = ? AND trip_id = ?").get(bookingId, id) as any;
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      const currentStatus = booking.status;
      const details = JSON.parse(booking.details);

      db.prepare("UPDATE bookings SET status = ? WHERE id = ? AND trip_id = ?").run(status, bookingId, id);

      let refundAmount = 0;
      let tripUpdated = false;
      let updatedTrip = null;

      if (status === 'Cancelled' && currentStatus !== 'Cancelled') {
        // Process refund
        const costString = details.cost || "0";
        refundAmount = parseInt(costString.replace(/[^0-9]/g, ''), 10) || 0;

        // Update trip budget
        const trip = db.prepare("SELECT * FROM trips WHERE id = ?").get(id) as any;
        if (trip) {
          const itinerary = JSON.parse(trip.itinerary);
          if (itinerary.estimatedCosts) {
            const typeKey = booking.type === 'flight' || booking.type === 'train' || booking.type === 'bus' || booking.type === 'car' ? 'transport' : booking.type;
            
            if (itinerary.estimatedCosts[typeKey]) {
              itinerary.estimatedCosts[typeKey] = Math.max(0, itinerary.estimatedCosts[typeKey] - refundAmount);
            }
            
            // Recalculate total
            itinerary.estimatedCosts.total = (itinerary.estimatedCosts.transport || 0) + 
                                             (itinerary.estimatedCosts.hotel || 0) + 
                                             (itinerary.estimatedCosts.food || 0) + 
                                             (itinerary.estimatedCosts.activities || 0);

            db.prepare("UPDATE trips SET itinerary = ? WHERE id = ?").run(JSON.stringify(itinerary), id);
            updatedTrip = { ...trip, interests: JSON.parse(trip.interests), itinerary };
            tripUpdated = true;
          }
        }
      }

      const updatedBooking = db.prepare("SELECT * FROM bookings WHERE id = ?").get(bookingId) as any;
      const parsedBooking = {
        ...updatedBooking,
        details: JSON.parse(updatedBooking.details)
      };

      io.to(`trip_${id}`).emit("booking_updated", parsedBooking);

      if (tripUpdated) {
        io.to(`trip_${id}`).emit("trip_updated", updatedTrip);
      }

      res.json({ booking: parsedBooking, refundAmount, trip: updatedTrip });
    } catch (error) {
      console.error("Failed to update booking status:", error);
      res.status(500).json({ error: "Failed to update booking status" });
    }
  });

  app.post("/api/places/details", async (req, res) => {
    try {
      const { place, destination } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      
      const fallbackData = {
        description: `${place} is a must-visit location in ${destination}. It offers a unique blend of culture, history, and beautiful sights that attract visitors from all over the world.`,
        bestTime: "Spring or Autumn for the most pleasant weather.",
        highlights: [
          "Explore the local surroundings and architecture.",
          "Try the authentic local cuisine nearby.",
          "Take a guided tour to learn about the history."
        ]
      };

      if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "TODO_KEYHERE") {
        return res.json(fallbackData);
      }

      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `Provide a short, engaging travel guide for "${place}" in "${destination}". 
        Include a brief description (2-3 sentences), the best time to visit, and 2-3 key highlights or things to do there.
        Return ONLY a valid JSON object with this structure:
        {
          "description": "...",
          "bestTime": "...",
          "highlights": ["...", "..."]
        }`;

        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
          }
        });

        if (response.text) {
          res.json(JSON.parse(response.text));
        } else {
          res.json(fallbackData);
        }
      } catch (aiError) {
        console.error("AI API failed, using fallback:", aiError);
        res.json(fallbackData);
      }
    } catch (error) {
      console.error("Failed to fetch place details:", error);
      res.status(500).json({ error: "Failed to fetch place details" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
