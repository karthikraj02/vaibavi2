const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

const createTransporter = async () => {
  if (process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD) {
    return {
      transporter: nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_APP_PASSWORD,
        },
      }),
      from: process.env.EMAIL_USER,
      isTest: false,
    };
  }

  const testAccount = await nodemailer.createTestAccount();
  return {
    transporter: nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    }),
    from: testAccount.user,
    isTest: true,
  };
};

const buildPdfBuffer = async ({ bookingRef, passengerName, flight, seat, departureDate, totalAmount, currency }) => {
  const qrData = `FlightAgent|${bookingRef}|${flight.flightNumber}|${flight.from}-${flight.to}|${passengerName}`;
  const qrCodeDataUrl = await QRCode.toDataURL(qrData, { width: 120, margin: 1 });
  const qrBuffer = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.rect(0, 0, 615, 80).fill('#0B0F19');
    doc.fontSize(28).font('Helvetica-Bold').fillColor('#00F0FF').text('Flight', 40, 25, { continued: true });
    doc.fillColor('#8A2BE2').text('Agent');
    doc.fontSize(10).fillColor('#888').text('E-TICKET / BOARDING PASS', 40, 58);
    doc.fillColor('#888').text(`PNR: ${bookingRef}`, 350, 30, { align: 'right', width: 220 });

    doc.fillColor('#333').fontSize(18).font('Helvetica-Bold').text(flight.airline || 'Flight', 40, 100);
    doc.fontSize(12).fillColor('#666').text(`Flight ${flight.flightNumber || ''}`, 40, 125);

    const rY = 160;
    doc.rect(30, rY - 10, 535, 100).lineWidth(1).strokeColor('#ddd').stroke();
    doc.fontSize(36).font('Helvetica-Bold').fillColor('#1a1a2e').text(flight.from, 60, rY + 10);
    doc.fontSize(10).fillColor('#888').text('DEPARTURE', 60, rY + 55);
    doc.fontSize(20).fillColor('#00F0FF').text('✈  →', 230, rY + 20);
    doc.fontSize(36).font('Helvetica-Bold').fillColor('#1a1a2e').text(flight.to, 380, rY + 10);
    doc.fontSize(10).fillColor('#888').text('ARRIVAL', 380, rY + 55);

    const dY = 280;
    doc.rect(30, dY - 10, 535, 130).fill('#f8f9fa');
    const items = [
      ['PASSENGER', (passengerName || '').toUpperCase()],
      ['DATE', departureDate || 'TBD'],
      ['SEAT', seat || 'TBD'],
      ['CLASS', flight.cabinClass || 'Economy'],
      ['STATUS', 'CONFIRMED'],
    ];
    items.forEach((item, i) => {
      const x = 50 + (i % 3) * 180;
      const y = dY + 5 + Math.floor(i / 3) * 40;
      doc.fontSize(8).fillColor('#888').font('Helvetica').text(item[0], x, y);
      doc.fontSize(12).font('Helvetica-Bold').fillColor(item[0] === 'STATUS' ? '#22c55e' : '#1a1a2e').text(item[1], x, y + 12);
    });

    const recY = 430;
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#333').text('Payment Receipt', 40, recY + 15);
    doc.fontSize(12).fillColor('#555').text(`Total Paid: ${currency?.toUpperCase() || 'USD'} ${totalAmount}`, 50, recY + 45);

    doc.image(qrBuffer, 240, recY + 80, { width: 100 });
    doc.end();
  });
};

exports.sendBookingConfirmation = async ({
  toEmail,
  passengerName,
  bookingRef,
  flight,
  seat,
  departureDate,
  totalAmount,
  currency = 'usd',
}) => {
  const { transporter, from, isTest } = await createTransporter();
  const pdfBuffer = await buildPdfBuffer({
    bookingRef,
    passengerName,
    flight,
    seat,
    departureDate,
    totalAmount,
    currency,
  });

  const mailOptions = {
    from: `"FlightAgent" <${from}>`,
    to: toEmail,
    subject: `✈️ Booking Confirmed — ${flight.airline} ${flight.from} → ${flight.to} (${bookingRef})`,
    html: `
      <div style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#0B0F19;color:white;border-radius:16px;padding:32px;">
        <h1 style="margin:0;"><span style="color:#00F0FF;">Flight</span><span style="color:#8A2BE2;">Agent</span></h1>
        <p style="color:#888;">Your booking is confirmed.</p>
        <p style="color:#00F0FF;font-size:22px;font-weight:800;letter-spacing:2px;">${bookingRef}</p>
        <p><strong>${flight.airline}</strong> — ${flight.flightNumber}</p>
        <p>${flight.from} → ${flight.to}</p>
        <p>Passenger: <strong>${passengerName}</strong></p>
        <p>Seat: <strong>${seat || 'Assigned at check-in'}</strong></p>
        <p>Total: <strong>${currency.toUpperCase()} ${totalAmount}</strong></p>
        <p style="color:#888;font-size:12px;">Your PDF e-ticket is attached.</p>
      </div>
    `,
    attachments: [{ filename: `FlightAgent-${bookingRef}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }],
  };

  const info = await transporter.sendMail(mailOptions);
  const etherealUrl = isTest ? nodemailer.getTestMessageUrl(info) : null;
  return { success: true, etherealUrl };
};
