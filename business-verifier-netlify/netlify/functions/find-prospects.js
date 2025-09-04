exports.handler = async (event) => {
    // Securely access the API key stored in Netlify's environment variables.
    const { GOOGLE_PLACES_API_KEY } = process.env;
    if (!GOOGLE_PLACES_API_KEY) {
        return { statusCode: 500, body: JSON.stringify({ error: 'API key is not configured.' }) };
    }

    try {
        // Parse the data sent from the website.
        const { zipCodes, existingNames } = JSON.parse(event.body);
        if (!zipCodes || zipCodes.length === 0) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Zip codes are required.' }) };
        }

        // Create a quick-lookup set for existing business names.
        const existingNamesSet = new Set(existingNames.map(name => name.toLowerCase()));
        const allProspects = new Map();

        // Helper function to turn a zip code into map coordinates.
        const getCoordsForZip = async (zip) => {
            const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${zip}&key=${GOOGLE_PLACES_API_KEY}`;
            const response = await fetch(geocodeUrl);
            const data = await response.json();
            if (data.status === 'OK' && data.results[0]) {
                return data.results[0].geometry.location;
            }
            return null;
        };

        // Loop through each unique zip code to find prospects.
        for (const zip of zipCodes) {
            const location = await getCoordsForZip(zip);
            if (!location) continue; // Skip if the zip code is invalid.

            // Perform a "Nearby Search" to find businesses in the area.
            const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location.lat},${location.lng}&radius=5000&type=store&key=${GOOGLE_PLACES_API_KEY}`;
            const response = await fetch(nearbyUrl);
            const data = await response.json();

            if (data.status === 'OK') {
                for (const place of data.results) {
                    const name = place.name;
                    const address = place.vicinity;
                    
                    // Check if the business is new and not one you already have.
                    if (name && !existingNamesSet.has(name.toLowerCase())) {
                        // Add to a Map to automatically handle duplicates.
                        allProspects.set(name.toLowerCase(), {
                            'Business Name': name,
                            'Address': address,
                            'Phone Number': place.formatted_phone_number || 'N/A',
                        });
                    }
                }
            }
        }
        
        // Return the final, clean list of new prospects.
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prospects: Array.from(allProspects.values()) }),
        };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};


