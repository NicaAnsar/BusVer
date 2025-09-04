// This function uses the modern 'fetch' built into Netlify's environment.

exports.handler = async (event) => {
    // Securely access the API key stored as an environment variable in your Netlify site settings.
    const { GOOGLE_PLACES_API_KEY } = process.env;

    // Check if the API key is configured.
    if (!GOOGLE_PLACES_API_KEY) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Google Places API key is not configured.' }) };
    }

    try {
        // Parse the data sent from the website (a single business to verify).
        const { business } = JSON.parse(event.body);
        const businessName = business['Business Name'];
        const address = business['Address'];
        
        // Prepare the final result object.
        const result = {
            ...business,
            'Status': 'Not Found',
            'Current Occupant': 'N/A',
            'Verification Link': `https://www.google.com/search?q=${encodeURIComponent(businessName + ' ' + address)}`
        };

        if (!businessName) {
            result.Status = 'API Error';
            result['Current Occupant'] = 'Business Name not provided.';
            return { statusCode: 200, body: JSON.stringify(result) };
        }

        // Construct the URL for the Google Places "Find Place" API.
        const apiUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(businessName + ' ' + address)}&inputtype=textquery&fields=name,formatted_address&key=${GOOGLE_PLACES_API_KEY}`;
        
        const response = await fetch(apiUrl);
        const data = await response.json();

        // Analyze the API response to determine the verification status.
        if (data.status === 'OK' && data.candidates && data.candidates.length > 0) {
            result.Status = 'Verified';
            result['Current Occupant'] = data.candidates[0].name;
        } else if (data.status !== 'ZERO_RESULTS') {
            console.error('Google Places API Error:', data);
            result.Status = 'API Error';
            result['Current Occupant'] = data.error_message || 'An API error occurred.';
        }
        
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(result),
        };

    } catch (error) {
        console.error('Verification Function Error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};

