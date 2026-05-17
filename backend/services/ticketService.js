const Ticket = require('../models/Ticket');
const Booking = require('../models/Booking');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class TicketService {
    /**
     * Generate tickets for a booking
     */
    async generateTicketsForBooking(bookingId) {
        try {
            const booking = await Booking.findById(bookingId).populate('flight');
            if (!booking) throw new Error('Booking not found');

            const tickets = [];
            for (let i = 0; i < booking.passengers.length; i++) {
                const passenger = booking.passengers[i];
                const ticketNumber = `${booking.flight.flightNumber}-${booking.pnr}-${i + 1}`;
                
                // Generate QR Code
                const qrData = JSON.stringify({
                    ticketNumber,
                    pnr: booking.pnr,
                    passenger: passenger.name,
                    flight: booking.flight.flightNumber
                });
                const qrCode = await QRCode.toDataURL(qrData);

                const ticket = await Ticket.create({
                    bookingId,
                    ticketNumber,
                    passengerId: passenger.passportNumber,
                    passengerName: passenger.name,
                    flightId: booking.flight._id,
                    pnr: booking.pnr,
                    seatNumber: booking.seats[i] || 'TBD',
                    cabinClass: booking.cabinClass,
                    qrCode,
                    status: 'issued',
                    baggage: {
                        pieces: 1,
                        weight: booking.cabinClass === 'first' ? 30 : booking.cabinClass === 'business' ? 25 : 20
                    }
                });

                tickets.push(ticket);
            }

            return tickets;
        } catch (error) {
            throw new Error(`Ticket generation failed: ${error.message}`);
        }
    }

    /**
     * Generate PDF ticket
     */
    async generatePDFTicket(ticketId) {
        try {
            const ticket = await Ticket.findById(ticketId).populate('flightId');
            if (!ticket) throw new Error('Ticket not found');

            const doc = new PDFDocument();
            const fileName = `ticket_${ticket.ticketNumber}.pdf`;
            const filePath = path.join(__dirname, '../uploads', fileName);

            // Ensure uploads directory exists
            if (!fs.existsSync(path.join(__dirname, '../uploads'))) {
                fs.mkdirSync(path.join(__dirname, '../uploads'), { recursive: true });
            }

            const stream = fs.createWriteStream(filePath);
            doc.pipe(stream);

            // Header
            doc.fontSize(20).text('✈️ FLIGHT TICKET', 100, 50);
            doc.fontSize(10).text(`Ticket Number: ${ticket.ticketNumber}`, 100, 100);
            doc.text(`PNR: ${ticket.pnr}`, 100, 120);
            doc.text(`Issue Date: ${new Date(ticket.issueDate).toLocaleDateString()}`, 100, 140);

            // Passenger Info
            doc.fontSize(12).text('PASSENGER INFORMATION', 100, 180);
            doc.fontSize(10).text(`Name: ${ticket.passengerName}`, 100, 210);
            doc.text(`Seat: ${ticket.seatNumber}`, 100, 230);
            doc.text(`Class: ${ticket.cabinClass.toUpperCase()}`, 100, 250);

            // Flight Info
            doc.fontSize(12).text('FLIGHT DETAILS', 100, 300);
            doc.fontSize(10).text(`Flight: ${ticket.flightId.flightNumber}`, 100, 330);
            doc.text(`From: ${ticket.flightId.departureAirport}`, 100, 350);
            doc.text(`To: ${ticket.flightId.destinationAirport}`, 100, 370);
            doc.text(`Departure: ${new Date(ticket.flightId.departureDate).toLocaleString()}`, 100, 390);

            // QR Code
            const qrBuffer = await QRCode.toBuffer(JSON.stringify({
                ticketNumber: ticket.ticketNumber,
                pnr: ticket.pnr,
                passenger: ticket.passengerName
            }));
            doc.image(qrBuffer, 400, 200, { width: 150, height: 150 });

            // Footer
            doc.fontSize(8).text('This is an electronic ticket. Please present your confirmation email at check-in.', 50, 550);
            doc.text(`Generated on: ${new Date().toLocaleString()}`, 50, 570);

            doc.end();

            return new Promise((resolve, reject) => {
                stream.on('finish', () => {
                    // Update ticket with PDF URL
                    ticket.pdfUrl = `/uploads/${fileName}`;
                    ticket.save();
                    resolve(filePath);
                });
                stream.on('error', reject);
            });
        } catch (error) {
            throw new Error(`PDF generation failed: ${error.message}`);
        }
    }

    /**
     * Check-in passenger
     */
    async checkInPassenger(ticketId) {
        try {
            const ticket = await Ticket.findById(ticketId);
            if (!ticket) throw new Error('Ticket not found');
            if (ticket.status !== 'issued') throw new Error('Ticket already checked in or used');

            ticket.status = 'checked_in';
            ticket.checkInTime = new Date();
            await ticket.save();

            return ticket;
        } catch (error) {
            throw new Error(`Check-in failed: ${error.message}`);
        }
    }

    /**
     * Board passenger
     */
    async boardPassenger(ticketId) {
        try {
            const ticket = await Ticket.findById(ticketId);
            if (!ticket) throw new Error('Ticket not found');
            if (ticket.status !== 'checked_in') throw new Error('Passenger must be checked in first');

            ticket.status = 'boarded';
            ticket.boardingTime = new Date();
            await ticket.save();

            return ticket;
        } catch (error) {
            throw new Error(`Boarding failed: ${error.message}`);
        }
    }

    /**
     * Get tickets by booking
     */
    async getTicketsByBooking(bookingId) {
        try {
            const tickets = await Ticket.find({ bookingId }).sort({ createdAt: 1 });
            return tickets;
        } catch (error) {
            throw new Error(`Failed to fetch tickets: ${error.message}`);
        }
    }

    /**
     * Verify ticket authenticity
     */
    async verifyTicket(ticketNumber, pnr) {
        try {
            const ticket = await Ticket.findOne({ ticketNumber, pnr });
            if (!ticket) return { valid: false, message: 'Ticket not found' };

            return {
                valid: true,
                ticket: {
                    passengerName: ticket.passengerName,
                    flightNumber: ticket.flightId,
                    seatNumber: ticket.seatNumber,
                    status: ticket.status,
                    boardingTime: ticket.boardingTime
                }
            };
        } catch (error) {
            throw new Error(`Verification failed: ${error.message}`);
        }
    }
}

module.exports = new TicketService();