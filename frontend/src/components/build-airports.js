const fs = require('fs');
const https = require('https');

const url = 'https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat';

https.get(url, (res) => {
    let data = '';

    res.on('data', chunk => {
        data += chunk;
    });

    res.on('end', () => {
        const lines = data.split('\n');

        const airportLookup = {};

        lines.forEach(line => {
            const parts = line.split(',');

            if (parts.length > 4) {
                const name = parts[1]?.replace(/"/g, '');
                const city = parts[2]?.replace(/"/g, '');
                const country = parts[3]?.replace(/"/g, '');
                const iata = parts[4]?.replace(/"/g, '');
                const icao = parts[5]?.replace(/"/g, '');

                if (iata && iata !== '\\N') {
                    airportLookup[iata] = {
                        city,
                        country,
                        full: name,
                        icao
                    };
                }
            }
        });

        fs.writeFileSync(
            'airportLookup.json',
            JSON.stringify(airportLookup, null, 2)
        );

        console.log('airportLookup.json created successfully');
        console.log(`Total airports: ${Object.keys(airportLookup).length}`);
    });
});