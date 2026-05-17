const fs = require('fs');
const https = require('https');

// Fetch real-world airline routes from OpenFlights
const routesUrl = 'https://raw.githubusercontent.com/jpatokal/openflights/master/data/routes.dat';
const airlinesUrl = 'https://raw.githubusercontent.com/jpatokal/openflights/master/data/airlines.dat';

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

const airlineLogos = {};
const airlineNames = {};

// Realistic base prices by distance category
function getPrice(from, to) {
  const short = ['EU','AS','NA','SA','AF','OC'];
  // Simple hash to get consistent but varied pricing
  const hash = (from.charCodeAt(0) + to.charCodeAt(0) + from.charCodeAt(1) + to.charCodeAt(1)) % 200;
  const base = 200 + hash * 8;
  return Math.round(base / 10) * 10;
}

function getTime() {
  const h = Math.floor(Math.random() * 24);
  const m = Math.floor(Math.random() * 4) * 15;
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ap}`;
}

function getDuration() {
  const h = 1 + Math.floor(Math.random() * 18);
  const m = Math.floor(Math.random() * 4) * 15;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function getTerminal() {
  const terms = ['Terminal 1', 'Terminal 2', 'Terminal 3', 'Terminal 4', 'Main', 'International', 'Domestic', 'North', 'South'];
  return terms[Math.floor(Math.random() * terms.length)];
}

function getGate() {
  const letters = 'ABCDEFGHJK';
  const l = letters[Math.floor(Math.random() * letters.length)];
  const n = 1 + Math.floor(Math.random() * 50);
  return `${l}${n}`;
}

function getStatus() {
  const r = Math.random();
  if (r < 0.7) return { status: 'On Time', delay: 'None' };
  if (r < 0.85) return { status: 'Delayed', delay: `${(Math.floor(Math.random() * 6) + 1) * 15} mins` };
  if (r < 0.95) return { status: 'Boarding', delay: 'None' };
  return { status: 'Scheduled', delay: 'None' };
}

async function main() {
  console.log('Fetching airlines...');
  const airlinesData = await fetch(airlinesUrl);
  airlinesData.split('\n').forEach(line => {
    const parts = line.split(',');
    if (parts.length > 4) {
      const name = (parts[1] || '').replace(/"/g, '').trim();
      const iata = (parts[3] || '').replace(/"/g, '').trim();
      if (iata && iata !== '\\N' && iata !== '-' && name) {
        airlineNames[iata] = name;
        airlineLogos[iata] = `https://images.kiwi.com/airlines/64/${iata}.png`;
      }
    }
  });

  console.log(`Loaded ${Object.keys(airlineNames).length} airlines`);

  console.log('Fetching routes...');
  const routesData = await fetch(routesUrl);
  const lines = routesData.split('\n');
  
  const flights = [];
  const seen = new Set();
  let id = 1;

  lines.forEach(line => {
    const parts = line.split(',');
    if (parts.length < 7) return;
    
    const airlineCode = (parts[0] || '').replace(/"/g, '').trim();
    const fromAirport = (parts[2] || '').replace(/"/g, '').trim();
    const toAirport = (parts[4] || '').replace(/"/g, '').trim();
    
    // Skip invalid entries
    if (!airlineCode || airlineCode === '\\N' || !fromAirport || fromAirport === '\\N' || !toAirport || toAirport === '\\N') return;
    if (fromAirport.length !== 3 || toAirport.length !== 3) return;
    if (!airlineNames[airlineCode]) return;

    const key = `${airlineCode}-${fromAirport}-${toAirport}`;
    if (seen.has(key)) return;
    seen.add(key);

    const { status, delay } = getStatus();
    const flightNum = `${airlineCode}${100 + Math.floor(Math.random() * 900)}`;

    flights.push({
      id: id++,
      flightNumber: flightNum,
      airline: airlineNames[airlineCode],
      logo: airlineLogos[airlineCode],
      from: fromAirport,
      to: toAirport,
      price: getPrice(fromAirport, toAirport),
      time: `${getTime()} - ${getTime()}`,
      duration: getDuration(),
      status,
      delay,
      departureTerminal: getTerminal(),
      departureGate: getGate(),
      arrivalTerminal: getTerminal(),
      arrivalGate: getGate()
    });
  });

  console.log(`Generated ${flights.length} flights`);

  fs.writeFileSync(
    'src/data/flights.json',
    JSON.stringify(flights, null, 0) // compact to save space
  );

  console.log('src/data/flights.json created successfully');
  console.log(`File size: ${(fs.statSync('src/data/flights.json').size / 1024 / 1024).toFixed(2)} MB`);
}

main().catch(console.error);
