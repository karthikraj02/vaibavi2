# FlightAgent - AI-Powered Flight Booking System

## Overview
FlightAgent is an enterprise-level, modern, and highly scalable AI-powered flight booking and management ecosystem.

---

## Duffel API Flight Booking Integration

You can now search for (and soon book) flights directly from your own site backend using the [Duffel API](https://duffel.com/).

### Setup Duffel Integration

1. **Sign up for Duffel:**
   - Go to https://duffel.com/ and get your (sandbox) access token.

2. **Set Up Environment:**
   - Copy `.env.example` to `.env`
   - Add your Duffel access token to `.env`

3. **Install Dependencies:**
   - At the project root, run:
     ```
     npm install express axios dotenv
     ```

4. **Start the API Server:**
   - Run:
     ```
     node duffel-flight.js
     ```

5. **Test Flight Search Endpoint:**
   - POST to `http://localhost:3000/api/flight-search` with JSON body:
     ```json
     {
       "origin": "LHR",
       "destination": "JFK",
       "departure_date": "2024-09-15"
     }
     ```

---

### Existing Tech Stack
- **Frontend:** React.js, Vite, Tailwind CSS, Framer Motion
- **Backend:** Node.js, Express.js, MongoDB, Socket.io
- **AI:** OpenAI API integrations

### Original Project Setup
#### 1. Backend
```bash
cd backend
npm install
npm install pdfkit qrcode nodemailer uuid
npm start
```
#### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
*Note: Configure your .env variables for MongoDB, Stripe, JWT, and OpenAI before running.*

## Next Steps for Booking Integration
- Implement the `/api/flight-book` endpoint for booking and payment handling (see Duffel API docs).
- Build a frontend UI for users to search and buy tickets.

**References:**
- [Duffel API Docs](https://duffel.com/docs/api)
- [Duffel Quick Start](https://duffel.com/docs/guides/quick-start)
