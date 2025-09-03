exports.handler = async (event) => {
    // This function now uses the native fetch command, no external library needed.
    const { GOOGLE_PLACES_API_KEY } = process.env;

    if (!GOOGLE_PLACES_API_KEY) {
        return { statusCode: 500, body: JSON.stringify({ error: 'API key is not configured on Netlify.' }) };
    }

    try {
        const { name, address } = JSON.parse(event.body);
        if (!name) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Business name is required.' }) };
        }

        const input = `${name} ${address || ''}`;
        const fields = 'name,formatted_address,place_id';
        const apiUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(input)}&inputtype=textquery&fields=${fields}&key=${GOOGLE_PLACES_API_KEY}`;
        
        const response = await fetch(apiUrl);
        const data = await response.json();

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};

