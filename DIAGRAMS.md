# 📊 FlightAgent: Control Flow, Data Flow, and Entity-Relationship Diagrams

This document contains high-fidelity visual diagrams explaining the execution logic, data lifecycle, and database schemas of the **FlightAgent** system.

---

## 🔁 1. Control Flow Diagram (CFD)

The Control Flow Diagram traces the step-by-step logic path when a passenger searches for a flight, locks a seat, triggers Stripe checkout, and receives a cryptographic ticket.

```mermaid
flowchart TD
    Start([User opens Search Dashboard]) --> Search[Enter Airport, Date, Currency]
    Search --> API_Query{Query backend POST /api/flights/search}
    
    API_Query --> |Duffel Enabled| Duffel[Fetch live global GDS flight offers]
    API_Query --> |Duffel Disabled| LocalDB[Fetch seeded flights from MongoDB]
    
    Duffel & LocalDB --> Display[Display beautiful flight selection list]
    Display --> SeatMap[User views and selects seat map]
    SeatMap --> Lock{Acquire 5-min seat lock in DB}
    
    Lock --> |Lock Failed / Taken| SeatMap
    Lock --> |Lock Confirmed| StripeInit[Initialize Stripe Checkout Session]
    
    StripeInit --> Redirect[Redirect user to secure Stripe payment page]
    Redirect --> PaymentCheck{User completes payment?}
    
    %% Payment Flow Failures
    PaymentCheck --> |No / Cancel / Timeout| ReleaseLock[Release seat lock in MongoDB]
    ReleaseLock --> SeatMap
    
    %% Payment Flow Success
    PaymentCheck --> |Yes / Success| Webhook[Stripe triggers secure POST /api/webhooks/stripe]
    Webhook --> Verify[Verify Stripe Signature & Payment Intent]
    
    Verify --> ConfirmBooking[Update Booking status: confirmed]
    ConfirmBooking --> QRGen[Generate secure cryptographically unique QR Code]
    QRGen --> PDFGen[Compile dynamic Boarding Pass PDF via pdfkit]
    PDFGen --> TicketCreate[Save Passenger Tickets to DB: status issued]
    
    TicketCreate --> Mailer[Trigger Nodemailer to dispatch confirmation email]
    Mailer --> End([User views and downloads PDF ticket in MyTickets])
```

---

## 🔀 2. Data Flow Diagram (DFD - Level 1)

This DFD outlines the inputs, outputs, processes, and database stores of the system, tracking how user credentials, checkout events, flight updates, and Gemini inputs are processed.

```mermaid
graph TD
    %% External Entities
    subgraph Entities [External Entities]
        User[Passenger / Admin]
        Stripe[Stripe Payment Gateway]
        Gemini[Google Gemini API]
        SMTP[SMTP Email Server]
    end

    %% Database Stores
    subgraph Stores [MongoDB Database Stores]
        D1[(Users Collection)]
        D2[(Flights & FlightStatus Collections)]
        D3[(Bookings & Tickets Collections)]
        D4[(Refunds & Policies Collections)]
    end

    %% Core System Processes
    subgraph Processes [System Processes]
        P1((1. Auth & Profiles))
        P2((2. Flight search & GDS))
        P3((3. Seat Lock & Checkout))
        P4((4. Stripe Webhook Parser))
        P5((5. PDF Ticket Generator))
        P6((6. Refund Engine))
        P7((7. AI Travel Assistant))
    end

    %% Data Flow Connections
    User --> |1. Credentials / OTP| P1
    P1 --> |Write User details| D1
    D1 --> |User Session| User

    User --> |2. Flight Search parameters| P2
    P2 --> |Query active flights| D2
    D2 --> |Return schedules| P2
    P2 --> |3. Seat Map & Select| P3

    P3 --> |Lock seats / Create Pending Booking| D3
    P3 --> |Stripe checkout session request| Stripe
    Stripe --> |Stripe secure payment success| P4
    
    P4 --> |Update booking status to confirmed| D3
    P4 --> |Trigger ticket generation| P5
    P5 --> |Create Ticket & QR Code| D3
    P5 --> |Stream PDF & QR data| SMTP
    SMTP --> |Boarding Pass Email Alert| User

    User --> |4. Cancel Booking / Refund Request| P6
    D4 --> |Validate Airline Refund Policies| P6
    P6 --> |Initiate Payment Reversal| Stripe
    P6 --> |Update Refund status to approved| D4

    User --> |5. Floating chatbot queries| P7
    D2 --> |Inject live flight schedules| P7
    P7 <--> |Round-robin Gemini rotating request| Gemini
    P7 --> |Concise schedule answer| User
```

---

## 🗄️ 3. Entity Relationship Diagram (ERD)

This physical database model outlines the relational design of your MongoDB Mongoose collections, detailing keys, reference fields, and logical cardinality.

```mermaid
erDiagram
    USER ||--o{ BOOKING : places
    USER ||--o{ REFUND : requests
    FLIGHT ||--o{ BOOKING : reserves
    FLIGHT ||--|| FLIGHT_STATUS : tracks
    BOOKING ||--|{ TICKET : generates
    BOOKING ||--o{ REFUND : initiates
    CANCELLATION_POLICY ||--o{ REFUND : guides

    USER {
        ObjectId id PK
        string name
        string email
        string password
        string role "passenger | admin"
        string googleId "Optional OAuth"
    }

    FLIGHT {
        ObjectId id PK
        string flightNumber
        string airline
        string departureAirport
        string arrivalAirport
        date departureTime
        date arrivalTime
        number price
        string status "scheduled | delayed | cancelled | diverted"
    }

    FLIGHT_STATUS {
        ObjectId id PK
        ObjectId flightId FK
        string currentStatus
        number delayMinutes
        string terminal
        string gate
        object weatherDeparture
        object weatherArrival
    }

    BOOKING {
        ObjectId id PK
        ObjectId userId FK
        ObjectId flightId FK
        array seats "Locked passenger seat coordinates"
        number totalPrice
        string status "pending | confirmed | cancelled | expired"
        string stripePaymentIntentId
        date expiresAt "5-minute seat timeout"
    }

    TICKET {
        ObjectId id PK
        ObjectId bookingId FK
        string passengerName
        string seatNumber
        string pnr "Airline passenger name record"
        string ticketNumber
        string status "issued | checked_in | boarded | used"
        string qrCodeUrl
    }

    REFUND {
        ObjectId id PK
        ObjectId bookingId FK
        ObjectId userId FK
        number amount
        string reason "passenger_request | flight_cancelled | delayed"
        string status "pending | approved | rejected | processed"
        string notes
    }

    CANCELLATION_POLICY {
        ObjectId id PK
        string airline
        number cancellationFee
        array refundScale "Time-based refund brackets"
    }
```

---

## 💡 How to Read these Diagrams in Your Code Editor

1. **Mermaid Previewers**: Many modern markdown viewers (such as VS Code Markdown Preview, GitHub, GitLab, or Obsidian) render these diagrams interactively.
2. **Interactive Flow**:
   * Refer to `backend/controllers/webhookController.js` and `backend/services/ticketService.js` to see the logic mapped in the **Control Flow Diagram**.
   * Refer to `backend/models/` to inspect the exact schema definitions sketched in the **Entity Relationship Diagram**.
