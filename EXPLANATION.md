# ✈️ FlightAgent: Full-Stack Enterprise Flight Booking & AI Assistant System

Welcome to the comprehensive architectural walkthrough and setup guide for **FlightAgent**. This document explains in deep, step-by-step detail how the codebase functions, lists the key features, weighs the architectural pros and cons, and shows you exactly how to run the project locally.

---

## 🏗️ High-Level System Architecture

FlightAgent is built as a modern **full-stack web application** using the MERN stack (MongoDB, Express.js, React, Node.js) styled with high-fidelity Tailwind CSS, powered by **Google Gemini 2.5** for AI-guided booking assistance, and integrated with **Stripe** for payment processing.

```mermaid
graph TD
    User([Passenger / Admin]) <--> |Interacts| Frontend[Vite + React SPA]
    Frontend <--> |REST API & WebSockets| Backend[Express.js Node Server]
    Backend <--> |Data Persistence| MongoDB[(MongoDB Server / In-Memory DB Fallback)]
    
    %% Third-party integrations
    Backend <--> |Gemini 2.5 Flash API| GeminiAPI[Google Gemini API (Key Rotator)]
    Backend <--> |Payment Processing| StripeAPI[Stripe Payment Gateway]
    Backend <--> |Automated Alerts| NodeMailer[Nodemailer Email Service]
    
    %% Internal Services
    Backend === TicketService[PDFKit Ticket Builder & QR Generator]
    Backend === RefundEngine[AI-Guided Refund Processor]
    Backend === LiveTracker[Flight Tracking & Weather Engine]
```

---

## 🔍 Step-by-Step Code Walkthrough

Here is a step-by-step technical breakdown of how each core engine in FlightAgent works behind the scenes.

### 1. Zero-Config Database & Server Bootup (`backend/server.js`)
When you start the backend server:
* **Config Load**: The app loads configuration variables via `dotenv` from `backend/.env`.
* **Zero-Config Database Fallback**: Unlike standard setups that crash if a local database isn't running, FlightAgent's database connector runs in a smart fallback cascade:
  1. **Production Mode**: Connects directly via the secure remote `MONGO_URI`.
  2. **Local MongoDB**: Tries to connect to a local MongoDB instance running on your machine (`mongodb://127.0.0.1:27017/flightagent`).
  3. **In-Memory Fallback**: If no local database is running, it spins up an **in-memory database instance** using `mongodb-memory-server`. This ensures developers can run the code immediately without downloading or installing MongoDB!
* **Server & Sockets**: Sets up a standard HTTP Express server coupled with a `Socket.io` server instance for future real-time pushing capabilities.

### 2. The Smart AI Travel Assistant (`backend/controllers/aiController.js`)
When a passenger interacts with the floating AI Chat Widget in the browser:
* **Context Gathering**: Before communicating with the Gemini model, the backend queries MongoDB for the top 30 active flights. It formats this live schedule (departure airports, arrival airports, times, prices, and flight numbers) into a concise textual summary.
* **Prompt Injection**: The live flight data is injected directly into the system instructions of the Gemini AI model. This gives the chatbot **real-time database awareness** to answer questions like *"What flights do you have to Mumbai tomorrow?"* or *"How much does flight AA102 cost?"* without querying external APIs repeatedly.
* **Round-Robin API Key Rotator**: If your project is heavily utilized, Gemini API free tiers can trigger rate limits (`429 Too Many Requests`). To prevent crashes, `aiController.js` accepts up to 6 distinct Gemini API keys (`GEMINI_API_KEY_1` to `GEMINI_API_KEY_6`). It automatically rotates keys after each successful query and fallback-switches key index if one fails!

### 3. Stripe payment Flow & Lockouts (`backend/routes/bookingRoutes.js`)
* **Seat Locking**: To prevent double-bookings, when a passenger selects seats, they are placed in a locked state in MongoDB with a 5-minute expiration timer.
* **Checkout & Session**: A Stripe checkout session is created. The backend listens to webhook events.
* **Stripe Webhook (`backend/controllers/webhookController.js`)**: Once Stripe returns a `checkout.session.completed` event, the webhook safely updates the booking status to `confirmed`, releases the seat locks permanently as "sold", and triggers the **Ticket Generation Engine**.

### 4. Cryptographic Ticket Builder (`backend/services/ticketService.js`)
Once a booking is marked confirmed:
* **QR & Barcodes**: The server uses the `qrcode` library to generate a highly unique, secure QR code containing passenger information, the PNR record, and ticket ID.
* **PDFKit Assembly**: The backend uses the `pdfkit` drawing library to dynamically compile a boarding pass in PDF format. It writes the airline branding, flight details, boarding gates, passenger name, seat numbers, and inserts the generated QR code directly into the document.
* **Online Check-in Workflow**: The passenger can view this interactive card in the `MyTickets` page. Clicking **Check In** online validates their booking and transitions their ticket status: `issued` ➡️ `checked_in` ➡️ `boarded` ➡️ `used`.

### 5. Automated Refund Engine (`backend/services/refundService.js`)
When a refund is requested or a flight status is modified:
* **Automatic Partial Calculations**: If a flight is delayed by over 2 hours, the engine automatically calculates a 50% partial refund eligibility. If a flight is cancelled by an admin, the passenger receives an automatic 100% refund.
* **AI-Guided Policies**: For passenger-requested cancellations, the refund engine evaluates rules against the airline's cancellation policy:
  * Cancelled > 48 hours before flight: 100% refund minus a small fee.
  * Cancelled 24-48 hours before flight: 50% refund.
  * Cancelled < 24 hours: No refund.
* **Admin Review Queue**: Requests land in the administrative review pipeline. Once approved, the backend initiates programmatic Stripe refund requests via the Stripe SDK.

### 6. Interactive Frontend Page Pipeline (`frontend/src/`)
* **Global Contexts (`src/context/`)**:
  * `AuthContext.jsx`: Keeps track of user logs, handles credentials, and securely stores JWT authentication tokens.
  * `CurrencyContext.jsx`: Implements state to dynamically convert prices in real-time between **USD, EUR, INR, GBP**, and more using dynamic exchange factors.
* **Interactive UI Pages**:
  * `FlightSearch.jsx`: Features a sleek glassmorphism dashboard containing interactive flight selectors, seat choosing boards, and credit-card payments.
  * `LiveTracking.jsx`: Links to the `Leaflet.js` map engine, drawing high-performance flight paths and showing coordinates of active flights in real-time.
  * `RefundTracker.jsx`: Allows users to request refunds with customized logs, monitoring status updates like `pending`, `approved`, or `processed`.

---

## ✨ Project Core Features

| Feature Category | Description | Technical Implementation |
| :--- | :--- | :--- |
| **🤖 Gemini AI Chatbot** | Dynamic floating conversational widget helping passengers search flights, check schedules, and verify policies. | `@google/genai` API + Live Flight Database Injected Context + Key Rotation |
| **🎟️ Ticket Management** | Automatic generation of printable boarding passes with unique secure cryptographic QR codes. | `pdfkit` + `qrcode` + custom Express PDF streaming endpoints |
| **💰 Stripe Checkout** | Handles secure, production-grade flight payments with automatic webhook validation. | Stripe SDK + Express raw-body webhooks + secure seat lock checks |
| **📍 Live Flight Tracking** | Visually tracks flight states (delayed, boarded, diverted) on interactive maps with airport terminal/gate updates. | `Leaflet.js` maps + OpenStreetMap API + custom tracking schema |
| **💸 Automatic Refunds** | Complete cancellation policy checking, automatic 100% refunds for cancelled flights, and admin dashboards. | Mongoose schemas + Stripe Refund APIs + Nodemailer automated triggers |
| **🔑 Secure Credentials** | User authentication with secure JWT tokens, secure route guards, and Google OAuth 2.0 Sign-In. | `@react-oauth/google` + JSON Web Tokens + `bcrypt` passwords |

---

## ⚖️ Architectural Pros and Cons

### 👍 The Pros (Advantages)
1. **Frictionless Developer Onboarding (In-Memory DB)**: Starting the backend is instantaneous. If a developer doesn't have a MongoDB database running locally, the project spins up its own temporary MongoDB inside system memory.
2. **High-Resiliency API Key Engine**: The unique Multi-Key Gemini Rotator prevents server failures if an API key gets rate-limited, distributing load seamlessly across different keys.
3. **Stunning Futuristic Dark Theme**: Built using React combined with Tailwind CSS and `Framer Motion`, offering a premium glassmorphic feel, responsive micro-animations, and elegant hovers.
4. **Strong Decoupled Design**: The separation of `models/`, `controllers/`, `routes/`, and `services/` makes it highly modular and easy to scale.
5. **No Payment Page Liability**: Utilizing Stripe Checkout sessions offloads absolute credit-card storage, compliance, and security liabilities onto Stripe.

### 👎 The Cons (Limitations)
1. **In-Memory Data Volatility**: If you run in fallback mode (without a persistent MongoDB instance), stopping the backend server will wipe all user registrations, tickets, and flights.
2. **Email Setup Requirements**: To use the automated Nodemailer notifications system, users must manually configure an app-password inside the `.env` file, which requires an active SMTP provider.
3. **SEO Page Hydration**: Being a Client-Side Rendered (CSR) Single Page Application built on React/Vite, SEO crawlers may face challenges reading full product lists dynamically unless pre-rendered.

---

## 🚀 How to Run the Project Locally

Follow these precise steps to launch both the Backend API and the Frontend client on your local computer.

### 📋 Prerequisites
Make sure you have the following installed on your machine:
* [Node.js](https://nodejs.org/en) (v18 or higher recommended)
* [NPM](https://www.npmjs.com/) (usually packaged automatically with Node.js)
* *(Optional)* [MongoDB Community Server](https://www.mongodb.com/try/download/community) running on port `27017` (If not present, the app will run in In-Memory mode).

---

### Step 1: Set Up and Run the Backend

1. **Navigate to the Backend directory**:
   ```bash
   cd backend
   ```

2. **Install all backend dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   * Duplicate the `.env.example` file in the `backend/` directory and rename it to `.env`.
   * Open `.env` and fill in the required fields:
     ```env
     PORT=5000
     JWT_SECRET=your_super_secret_jwt_key
     
     # Google Gemini API Key Rotator (Configure at least GEMINI_API_KEY_1)
     GEMINI_API_KEY_1=your_gemini_api_key_here
     
     # Stripe Credentials (Optional for local testing, required for payments)
     STRIPE_SECRET_KEY=your_stripe_secret_key
     STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
     
     # Nodemailer Config (For automatic ticket and delay email alerts)
     EMAIL_SERVICE=gmail
     EMAIL_USER=your-email@gmail.com
     EMAIL_PASSWORD=your-gmail-app-password
     ```

4. **Seed Database Policies**:
   Seed the basic cancellation policies into the database:
   ```bash
   node scripts/seedCancellationPolicies.js
   ```

5. **Start the Backend server**:
   * Run in **Development Mode** (with automatic code reload):
     ```bash
     npm run dev
     ```
   * Or run in standard **Production Start Mode**:
     ```bash
     npm start
     ```
   * You should see console feedback showing:
     * `Server running on port 5000`
     * `MongoDB connected locally` or `MongoDB connected to in-memory instance`

---

### Step 2: Set Up and Run the Frontend

1. **Open a new terminal window** and navigate to the Frontend directory:
   ```bash
   cd frontend
   ```

2. **Install all frontend dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   * Duplicate the `.env.example` file in the `frontend/` directory and rename it to `.env` or `.env.local`.
   * Add the backend server URL (normally defaults to port `5000`):
     ```env
     VITE_API_URL=http://localhost:5000
     ```

4. **Start the Frontend development server**:
   ```bash
   npm run dev
   ```

5. **Access the application**:
   * Open your browser and navigate to the local address displayed in your terminal (usually **`http://localhost:5173`** or **`http://localhost:3000`**).
   * Enjoy the futuristic design, interact with the AI assistant, search flights, select seats, and manage tickets!

---

*For additional assistance or custom endpoint configurations, please consult the inline document headers in `backend/controllers/` or post an issue in the repository logs!*
