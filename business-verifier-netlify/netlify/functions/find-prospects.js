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

        // --- Step 1: Extract unique cities from the address list ---
        // This regex looks for a common address pattern like ", Dallas, TX" to extract the city.
        const cityRegex = /,\s*([^,]+),\s*[A-Z]{2}/;
        const uniqueCities = [...new Set(
            businesses
                .map(b => (b['Address'] || '').match(cityRegex)?.[1].trim())
                .filter(Boolean)
        )];

        if (uniqueCities.length === 0) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Could not identify any cities from the addresses in your spreadsheet.' }) };
        }
        
        const allProspects = new Map();
        
        // --- Step 2: Perform a targeted "Text Search" for each city and keyword ---
        for (const city of uniqueCities) {
            const searchQuery = `${keyword} in ${city}`;
            const textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${GOOGLE_PLACES_API_KEY}`;
            
            const response = await fetch(textSearchUrl);
            const data = await response.json();

            if (data.status === 'OK') {
                for (const place of data.results) {
                    const name = place.name;
                    // Check if the business is new and not one from the original list.
                    if (name && !existingNamesSet.has(name.toLowerCase())) {
                        // Use a Map to automatically handle and remove duplicate prospects.
                        allProspects.set(name.toLowerCase(), {
                            'Business Name': name,
                            'Address': place.formatted_address || 'N/A',
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

