// This function uses the modern 'fetch' built into Netlify's environment.

exports.handler = async (event) => {
    // Securely access the Gemini API key stored as an environment variable in your Netlify site settings.
    const { GEMINI_API_KEY } = process.env;

    // Check if the API key is configured.
    if (!GEMINI_API_KEY) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Gemini API key is not configured.' }) };
    }

    try {
        // Parse the data sent from the website (headers and sample rows).
        const { headers, sampleData } = JSON.parse(event.body);
        if (!headers || headers.length === 0) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Spreadsheet headers are required for mapping.' }) };
        }

        // --- Construct the prompt for the Gemini LLM ---
        // This prompt asks the AI to act as a data processor and return a structured JSON response.
        const llmPrompt = `
You are an expert data processor. Analyze the following spreadsheet headers and the first few rows of data.
Your task is to determine which columns correspond to the following standard fields: 'Business Name', 'Address', 'Phone', 'Email'.

Return your answer as a single, valid JSON object where the keys are the original column headers and the values are the corresponding standard field.
If a column does not map to any standard field, omit it from the JSON.
If a standard field is not found in the spreadsheet, omit it from your response.
Ensure the output is only the JSON object and nothing else.

Headers: ${JSON.stringify(headers)}

Sample Data:
${sampleData.map(row => JSON.stringify(row)).join('\n')}

Example JSON response:
{
  "Company Name": "Business Name",
  "Full Address": "Address",
  "Contact Number": "Phone"
}
`;

        // --- Make the API call to the Gemini LLM using the updated model name ---
        const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
        
        const geminiResponse = await fetch(geminiApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: llmPrompt }] }] }),
        });

        if (!geminiResponse.ok) {
            const errorBody = await geminiResponse.text();
            console.error("Gemini API Error:", errorBody);
            return { statusCode: 500, body: JSON.stringify({ error: 'Failed to get a response from the AI mapping service.' }) };
        }

        const geminiData = await geminiResponse.json();
        
        // --- Clean up and parse the response from the LLM ---
        const rawText = geminiData.candidates[0].content.parts[0].text;
        const jsonText = rawText.replace(/```json|```/g, '').trim();
        const mapping = JSON.parse(jsonText);

        if (!mapping || Object.keys(mapping).length === 0) {
            throw new Error("The AI could not identify standard business fields in your spreadsheet.");
        }

        // Return the final, clean mapping object.
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mapping }),
        };

    } catch (error) {
        console.error('Intelligent Mapper Function Error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};

