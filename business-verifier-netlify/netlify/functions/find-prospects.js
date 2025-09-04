// This function uses the modern 'fetch' built into Netlify's environment.

exports.handler = async (event) => {
    // Securely access the API keys stored as environment variables in your Netlify site settings.
    const { GOOGLE_PLACES_API_KEY } = process.env;

    // Check if the necessary API keys are configured.
    if (!GOOGLE_PLACES_API_KEY) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Google Places API key is not configured correctly on Netlify.' }) };
    }

    try {
        // Parse the data sent from the website (the user's current business list and the prospect keyword).
        const { businesses, keyword } = JSON.parse(event.body);
        if (!businesses || businesses.length === 0) {
            return { statusCode: 400, body: JSON.stringify({ error: 'A list of businesses is required to find prospects.' }) };
        }
        if (!keyword) {
            return { statusCode: 400, body: JSON.stringify({ error: 'A keyword is required to find prospects.' }) };
        }

        const existingNamesSet = new Set(businesses.map(b => b['Business Name'].toLowerCase()));

        // --- Step 1: Extract unique zip codes and prepare for searching ---
        const zipRegex = /\b\d{5}\b/;
        const uniqueZips = [...new Set(businesses.map(b => (b['Address'] || '').match(zipRegex)?.[0]).filter(Boolean))];
        const allProspects = new Map();

        // Helper function to convert a zip code into map coordinates using the Geocoding API.
        const getCoordsForZip = async (zip) => {
            const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${zip}&key=${GOOGLE_PLACES_API_KEY}`;
            const response = await fetch(geocodeUrl);
            const data = await response.json();
            if (data.status === 'OK' && data.results[0]) {
                return data.results[0].geometry.location;
            }
            return null;
        };
        
        // --- Step 2: Perform a targeted "Nearby Search" for each zip code and keyword ---
        for (const zip of uniqueZips) {
            const location = await getCoordsForZip(zip);
            if (!location) continue; // Skip if the zip code can't be located.

            const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location.lat},${location.lng}&radius=5000&keyword=${encodeURIComponent(keyword)}&key=${GOOGLE_PLACES_API_KEY}`;
            const response = await fetch(nearbyUrl);
            const data = await response.json();

            if (data.status === 'OK') {
                for (const place of data.results) {
                    const name = place.name;
                    // Check if the business is new and not one from the original list.
                    if (name && !existingNamesSet.has(name.toLowerCase())) {
                        // Use a Map to automatically handle and remove duplicate prospects.
                        allProspects.set(name.toLowerCase(), {
                            'Business Name': name,
                            'Address': place.vicinity || 'N/A',
                            'Phone Number': place.formatted_phone_number || 'N/A',
                        });
                    }
                }
            }
        }
        
        // Return the final, clean list of new business prospects.
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prospects: Array.from(allProspects.values()) }),
        };
    } catch (error) {
        console.error('Prospecting Function Error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};

