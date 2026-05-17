const express = require('express');
const router = express.Router();
const ticketService = require('../services/ticketService');

router.post('/send-email', async (req, res) => {
    try {
        const { passengerName, passengerEmail, flight, bookingRef, seat, departureDate } = req.body;

        if (!passengerName || !passengerEmail || !flight || !bookingRef) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const PDFDocument = require('pdfkit');
        const QRCode = require('qrcode');
        const nodemailer = require('nodemailer');

        const qrData = `FlightAgent|${bookingRef}|${flight.flightNumber}|${flight.from}-${flight.to}|${passengerName}`;
        const qrCodeDataUrl = await QRCode.toDataURL(qrData, { width: 120, margin: 1 });
        const qrBuffer = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');

        const pdfBuffer = await new Promise((resolve, reject) => {
            const doc = new PDFDocument({ size: 'A4', margin: 40 });
            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            doc.rect(0, 0, 615, 80).fill('#0B0F19');
            doc.fontSize(28).font('Helvetica-Bold').fillColor('#00F0FF').text('Flight', 40, 25, { continued: true });
            doc.fillColor('#8A2BE2').text('Agent');
            doc.fillColor('#888').text(`PNR: ${bookingRef}`, 350, 30, { align: 'right', width: 220 });
            doc.fillColor('#333').fontSize(18).text(flight.airline, 40, 100);
            doc.fontSize(36).text(flight.from, 60, 160);
            doc.text('→', 250, 160);
            doc.text(flight.to, 380, 160);
            doc.image(qrBuffer, 240, 280, { width: 100 });
            doc.end();
        });

        let transporter;
        let isGmail = !!(process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD);
        let senderEmail = process.env.EMAIL_USER || '';

        if (isGmail) {
            transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_APP_PASSWORD },
            });
        } else {
            const testAccount = await nodemailer.createTestAccount();
            transporter = nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                secure: false,
                auth: { user: testAccount.user, pass: testAccount.pass },
            });
            senderEmail = testAccount.user;
        }

        const mailOptions = {
            from: `"FlightAgent" <${senderEmail}>`,
            to: passengerEmail,
            subject: `✈️ E-Ticket — ${flight.airline} ${flight.flightNumber}`,
            html: `<p>Your e-ticket for ${flight.from} → ${flight.to} is attached. PNR: <strong>${bookingRef}</strong></p>`,
            attachments: [{ filename: `FlightAgent-ETicket-${bookingRef}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }],
        };

        let etherealUrl = '';
        try {
            const info = await transporter.sendMail(mailOptions);
            if (!isGmail) etherealUrl = nodemailer.getTestMessageUrl(info);
            res.json({ success: true, message: 'E-ticket sent', etherealUrl });
        } catch (mailErr) {
            res.json({ success: true, message: 'E-Ticket generated; email failed: ' + mailErr.message, emailFailed: true });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/verify', async (req, res) => {
    try {
        const { ticketNumber, pnr } = req.body;
        const verification = await ticketService.verifyTicket(ticketNumber, pnr);
        res.json(verification);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/:bookingId', async (req, res) => {
    try {
        const tickets = await ticketService.getTicketsByBooking(req.params.bookingId);
        res.json({ success: true, tickets });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/:ticketId/checkin', async (req, res) => {
    try {
        const ticket = await ticketService.checkInPassenger(req.params.ticketId);
        res.json({ success: true, message: 'Checked in successfully', ticket });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/:ticketId/board', async (req, res) => {
    try {
        const ticket = await ticketService.boardPassenger(req.params.ticketId);
        res.json({ success: true, message: 'Boarded successfully', ticket });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/:ticketId/pdf', async (req, res) => {
    try {
        const filePath = await ticketService.generatePDFTicket(req.params.ticketId);
        res.download(filePath);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
