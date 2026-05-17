const express = require('express');
const router = express.Router();
const ticketService = require('../services/ticketService');

/**
 * GET /api/tickets/:bookingId
 * Get all tickets for a booking
 */
router.get('/:bookingId', async (req, res) => {
    try {
        const tickets = await ticketService.getTicketsByBooking(req.params.bookingId);
        res.json({ success: true, tickets });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/tickets/verify
 * Verify ticket authenticity
 */
router.post('/verify', async (req, res) => {
    try {
        const { ticketNumber, pnr } = req.body;
        const verification = await ticketService.verifyTicket(ticketNumber, pnr);
        res.json(verification);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/tickets/:ticketId/checkin
 * Check in a passenger
 */
router.post('/:ticketId/checkin', async (req, res) => {
    try {
        const ticket = await ticketService.checkInPassenger(req.params.ticketId);
        res.json({ success: true, message: 'Checked in successfully', ticket });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/tickets/:ticketId/board
 * Board a passenger
 */
router.post('/:ticketId/board', async (req, res) => {
    try {
        const ticket = await ticketService.boardPassenger(req.params.ticketId);
        res.json({ success: true, message: 'Boarded successfully', ticket });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * GET /api/tickets/:ticketId/pdf
 * Download ticket PDF
 */
router.get('/:ticketId/pdf', async (req, res) => {
    try {
        const filePath = await ticketService.generatePDFTicket(req.params.ticketId);
        res.download(filePath);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/tickets/send-email
 * Generate PDF e-ticket and email it to passenger
 */
router.post('/send-email', async (req, res) => {
    try {
        const { passengerName, passengerEmail, flight, bookingRef, seat, departureDate } = req.body;

        if (!passengerName || !passengerEmail || !flight || !bookingRef) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const PDFDocument = require('pdfkit');
        const QRCode = require('qrcode');
        const nodemailer = require('nodemailer');

        // Generate QR code
        const qrData = `FlightAgent|${bookingRef}|${flight.flightNumber}|${flight.from}-${flight.to}|${passengerName}`;
        const qrCodeDataUrl = await QRCode.toDataURL(qrData, { width: 120, margin: 1 });
        const qrBuffer = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');

        // Generate PDF
        const pdfBuffer = await new Promise((resolve, reject) => {
            const doc = new PDFDocument({ size: 'A4', margin: 40 });
            const chunks = [];
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // Header
            doc.rect(0, 0, 615, 80).fill('#0B0F19');
            doc.fontSize(28).font('Helvetica-Bold').fillColor('#00F0FF').text('Flight', 40, 25, { continued: true });
            doc.fillColor('#8A2BE2').text('Agent');
            doc.fontSize(10).fillColor('#888').text('E-TICKET / BOARDING PASS', 40, 58);
            doc.fillColor('#888').text(`PNR: ${bookingRef}`, 350, 30, { align: 'right', width: 220 });
            doc.fontSize(9).text(`Date: ${new Date().toLocaleString('en-IN')}`, 350, 48, { align: 'right', width: 220 });

            // Airline
            doc.fillColor('#333').fontSize(18).font('Helvetica-Bold').text(flight.airline, 40, 100);
            doc.fontSize(12).fillColor('#666').text(`Flight ${flight.flightNumber}`, 40, 125);

            // Route
            const rY = 160;
            doc.rect(30, rY - 10, 535, 100).lineWidth(1).strokeColor('#ddd').stroke();
            doc.fontSize(36).font('Helvetica-Bold').fillColor('#1a1a2e').text(flight.from, 60, rY + 10);
            doc.fontSize(10).fillColor('#888').text('DEPARTURE', 60, rY + 55);
            doc.fontSize(20).fillColor('#00F0FF').text('✈  →', 230, rY + 20);
            doc.fontSize(36).font('Helvetica-Bold').fillColor('#1a1a2e').text(flight.to, 380, rY + 10);
            doc.fontSize(10).fillColor('#888').text('ARRIVAL', 380, rY + 55);

            // Details
            const dY = 280;
            doc.rect(30, dY - 10, 535, 130).fill('#f8f9fa');
            const items = [
                ['PASSENGER', passengerName.toUpperCase()], ['DATE', departureDate || 'TBD'], ['SEAT', seat || 'TBD'],
                ['TERMINAL', flight.departureTerminal || 'T1'], ['GATE', flight.departureGate || 'TBD'], ['CLASS', 'Economy'],
                ['DEPARTURE', (flight.time || '').split('-')[0]?.trim() || 'TBD'], ['DURATION', flight.duration || 'TBD'], ['STATUS', 'CONFIRMED'],
            ];
            items.forEach((item, i) => {
                const x = 50 + (i % 3) * 180, y = dY + 5 + Math.floor(i / 3) * 40;
                doc.fontSize(8).fillColor('#888').font('Helvetica').text(item[0], x, y);
                doc.fontSize(12).font('Helvetica-Bold').fillColor(item[0] === 'STATUS' ? '#22c55e' : '#1a1a2e').text(item[1], x, y + 12);
            });

            // Receipt
            const recY = 430;
            doc.moveTo(30, recY).lineTo(565, recY).dash(5, { space: 5 }).strokeColor('#ddd').stroke();
            doc.undash();
            doc.fontSize(14).font('Helvetica-Bold').fillColor('#333').text('Payment Receipt', 40, recY + 15);
            const baseFare = Math.round(flight.price * 0.75);
            const taxes = Math.round(flight.price * 0.18);
            const surcharge = flight.price - baseFare - taxes;
            [['Base Fare', baseFare], ['Taxes & Fees', taxes], ['Fuel Surcharge', surcharge]].forEach(([label, val], i) => {
                const y = recY + 45 + i * 22;
                doc.fontSize(11).font('Helvetica').fillColor('#555').text(label, 50, y);
                doc.text(`$${val}`, 450, y, { align: 'right', width: 100 });
            });
            const tY = recY + 45 + 66 + 5;
            doc.moveTo(50, tY).lineTo(550, tY).lineWidth(2).strokeColor('#1a1a2e').stroke();
            doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a1a2e').text('Total Paid', 50, tY + 8);
            doc.text(`$${flight.price}`, 450, tY + 8, { align: 'right', width: 100 });

            // QR Code
            const qY = tY + 45;
            doc.moveTo(30, qY).lineTo(565, qY).dash(5, { space: 5 }).lineWidth(1).strokeColor('#ddd').stroke();
            doc.undash();
            doc.image(qrBuffer, 240, qY + 15, { width: 100 });
            doc.fontSize(8).font('Helvetica').fillColor('#888').text('Scan for boarding verification', 210, qY + 120, { align: 'center', width: 160 });
            doc.fontSize(10).font('Courier').fillColor('#aaa').text(`||||| ${bookingRef} ||| ${flight.flightNumber} ||| ${flight.from}${flight.to} |||||`, 40, qY + 145, { align: 'center', width: 500 });
            doc.fontSize(8).font('Helvetica').fillColor('#aaa').text('Demo e-ticket by FlightAgent. For real bookings use partner links.', 40, qY + 170, { align: 'center', width: 500 });

            doc.end();
        });

        // Configure email transporter
        let transporter;
        let isGmail = !!(process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD);
        let senderEmail = process.env.EMAIL_USER || '';

        if (isGmail) {
            transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_APP_PASSWORD }
            });
        } else {
            console.log("No custom Gmail credentials found. Using test ethereal account...");
            const testAccount = await nodemailer.createTestAccount();
            transporter = nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                secure: false,
                auth: { user: testAccount.user, pass: testAccount.pass }
            });
            senderEmail = testAccount.user;
        }

        const mailOptions = {
            from: `"FlightAgent" <${senderEmail}>`,
            to: passengerEmail,
            subject: `✈️ E-Ticket — ${flight.airline} ${flight.flightNumber} (${flight.from} → ${flight.to})`,
            html: `
                <div style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#0B0F19;color:white;border-radius:16px;overflow:hidden;">
                    <div style="background:linear-gradient(90deg,#00F0FF,#8A2BE2);padding:3px;"></div>
                    <div style="padding:32px;">
                        <h1 style="margin:0 0 4px;font-size:24px;"><span style="color:#00F0FF;">Flight</span><span style="color:#8A2BE2;">Agent</span></h1>
                        <p style="color:#888;margin:0 0 24px;font-size:13px;">E-Ticket Confirmation</p>
                        <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:20px;margin-bottom:16px;">
                            <p style="color:#888;font-size:11px;margin:0 0 4px;text-transform:uppercase;">Booking Reference</p>
                            <p style="color:#00F0FF;font-size:22px;font-weight:800;letter-spacing:2px;margin:0 0 16px;">${bookingRef}</p>
                            <table style="width:100%;border-collapse:collapse;">
                                <tr>
                                    <td style="text-align:center;padding:12px;"><div style="font-size:32px;font-weight:800;">${flight.from}</div><div style="color:#888;font-size:11px;">Departure</div></td>
                                    <td style="text-align:center;color:#00F0FF;font-size:20px;">✈ →</td>
                                    <td style="text-align:center;padding:12px;"><div style="font-size:32px;font-weight:800;">${flight.to}</div><div style="color:#888;font-size:11px;">Arrival</div></td>
                                </tr>
                            </table>
                        </div>
                        <table style="width:100%;border-collapse:collapse;">
                            <tr><td style="padding:8px 0;color:#888;font-size:12px;">Passenger</td><td style="padding:8px 0;text-align:right;font-weight:700;">${passengerName.toUpperCase()}</td></tr>
                            <tr><td style="padding:8px 0;color:#888;font-size:12px;">Airline</td><td style="padding:8px 0;text-align:right;font-weight:700;">${flight.airline}</td></tr>
                            <tr><td style="padding:8px 0;color:#888;font-size:12px;">Flight</td><td style="padding:8px 0;text-align:right;font-weight:700;">${flight.flightNumber}</td></tr>
                            <tr><td style="padding:8px 0;color:#888;font-size:12px;">Seat</td><td style="padding:8px 0;text-align:right;font-weight:700;">${seat}</td></tr>
                            <tr><td style="padding:8px 0;color:#888;font-size:12px;">Total</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#00F0FF;font-size:16px;">$${flight.price}</td></tr>
                        </table>
                        <p style="color:#888;font-size:12px;text-align:center;margin-top:20px;">Your PDF e-ticket with QR code is attached. Present at airport for check-in.</p>
                    </div>
                    <div style="background:rgba(255,255,255,0.05);padding:16px;text-align:center;color:#555;font-size:11px;">FlightAgent — Demo E-Ticket</div>
                </div>
            `,
            attachments: [{ filename: `FlightAgent-ETicket-${bookingRef}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }]
        };

        let emailSent = false;
        let emailErrorMessage = '';
        let etherealUrl = '';
        let info;

        try {
            info = await transporter.sendMail(mailOptions);
            emailSent = true;
            if (!isGmail) {
                etherealUrl = nodemailer.getTestMessageUrl(info);
                console.log('Ethereal preview URL:', etherealUrl);
            }
        } catch (mailErr) {
            console.error('Nodemailer SMTP failed:', mailErr.message);
            emailErrorMessage = mailErr.message;
        }

        if (emailSent) {
            res.json({ 
                success: true, 
                message: isGmail ? 'E-ticket sent to ' + passengerEmail : 'E-ticket sent via test service to ' + passengerEmail,
                etherealUrl
            });
        } else {
            res.json({
                success: true,
                message: 'E-Ticket generated successfully! (Note: Email delivery skipped: ' + emailErrorMessage + ')',
                emailFailed: true
            });
        }
    } catch (error) {
        console.error('Email ticket error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate ticket: ' + error.message });
    }
});

module.exports = router;