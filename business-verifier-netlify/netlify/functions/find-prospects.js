// This function uses the modern 'fetch' built into Netlify's environment.

exports.handler = async (event) => {
    // Securely access the API keys stored as environment variables in your Netlify site settings.
    const { GOOGLE_PLACES_API_KEY, GEMINI_API_KEY } = process.env;

    // Check if the necessary API keys are configured.
    if (!GOOGLE_PLACES_API_KEY || !GEMINI_API_KEY) {
        return { statusCode: 500, body: JSON.stringify({ error: 'API keys are not configured correctly on Netlify.' }) };
    }

    try {
        // Parse the data sent from the website (the user's current business list).
        const { businesses } = JSON.parse(event.body);
        if (!businesses || businesses.length === 0) {
            return { statusCode: 400, body: JSON.stringify({ error: 'A list of businesses is required to find prospects.' }) };
        }

        const existingNames = businesses.map(b => b['Business Name']);
        const existingNamesSet = new Set(existingNames.map(name => name.toLowerCase()));

        // --- Step 1 & 2: Use the Gemini API to analyze business names and generate relevant search keywords ---
        const llmPrompt = `Analyze the following list of business names. Based on the most common types of businesses, generate a JSON object containing a single key "search_keywords" with a value of an array of 5 highly relevant and specific search terms for the Google Places API to find similar businesses.

Business Names:
${existingNames.join('\n')}

Example Response: { "search_keywords": ["auto repair shop", "mechanic", "car maintenance", "oil change service", "brake repair"] }`;

        // Make the API call to the Gemini LLM.
        const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: llmPrompt }] }] }),
        });
        
        if (!geminiResponse.ok) {
             const errorBody = await geminiResponse.text();
             console.error("Gemini API Error:", errorBody);
             return { statusCode: 500, body: JSON.stringify({ error: 'Failed to generate keywords from Gemini API.' }) };
        }

        const geminiData = await geminiResponse.json();
        // Clean up the response from the LLM to ensure it's valid JSON.
        const searchKeywordsText = geminiData.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
        const { search_keywords } = JSON.parse(searchKeywordsText);
        
        if (!search_keywords || search_keywords.length === 0) {
             return { statusCode: 400, body: JSON.stringify({ error: 'Could not determine relevant search keywords from your business list.' }) };
        }

        // --- Step 3: Extract unique zip codes and prepare for searching ---
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
        
        // --- Step 4: Perform a targeted "Nearby Search" for each zip code and keyword ---
        for (const zip of uniqueZips) {
            const location = await getCoordsForZip(zip);
            if (!location) continue; // Skip if the zip code can't be located.

            for (const keyword of search_keywords) {
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

