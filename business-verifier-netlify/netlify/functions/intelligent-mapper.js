// This function uses the modern 'fetch' built into Netlify's environment.
exports.handler = async (event) => {
    // Securely access the Gemini API key stored as an environment variable in your Netlify site settings.
    const { GEMINI_API_KEY } = process.env;
    
    // Check if the API key is configured.
    if (!GEMINI_API_KEY) {
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: 'Gemini API key is not configured.' }) 
        };
    }

    try {
        // Parse the data sent from the website (headers and sample rows).
        const { headers, sampleData } = JSON.parse(event.body);
        
        // Input validation
        if (!headers || !Array.isArray(headers) || headers.length === 0) {
            return { 
                statusCode: 400, 
                body: JSON.stringify({ error: 'Spreadsheet headers are required for mapping.' }) 
            };
        }

        if (!Array.isArray(sampleData)) {
            return { 
                statusCode: 400, 
                body: JSON.stringify({ error: 'Sample data must be an array.' }) 
            };
        }

        // Limit data size to prevent huge prompts
        if (headers.length > 50) {
            return { 
                statusCode: 400, 
                body: JSON.stringify({ error: 'Too many columns. Maximum 50 headers allowed.' }) 
            };
        }

        // Limit sample data to first 10 rows for efficiency
        const limitedSampleData = sampleData.slice(0, 10);

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
${limitedSampleData.map(row => JSON.stringify(row)).join('\n')}

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
            body: JSON.stringify({ 
                contents: [{ parts: [{ text: llmPrompt }] }] 
            }),
        });

        // Enhanced API error handling
        if (!geminiResponse.ok) {
            const errorBody = await geminiResponse.text();
            console.error("Gemini API Error:", errorBody);
            
            let errorMessage = 'Failed to get a response from the AI mapping service.';
            
            // Handle specific error codes
            if (geminiResponse.status === 400) {
                errorMessage = 'Invalid request to AI service. Please check your data format.';
            } else if (geminiResponse.status === 401 || geminiResponse.status === 403) {
                errorMessage = 'AI service authentication failed. Please check configuration.';
            } else if (geminiResponse.status === 429) {
                errorMessage = 'AI service rate limit exceeded. Please try again later.';
            }
            
            return { 
                statusCode: 500, 
                body: JSON.stringify({ error: errorMessage }) 
            };
        }

        const geminiData = await geminiResponse.json();
        
        // Check if response has expected structure
        if (!geminiData.candidates || !geminiData.candidates[0] || !geminiData.candidates[0].content) {
            console.error('Unexpected Gemini response structure:', geminiData);
            return { 
                statusCode: 500, 
                body: JSON.stringify({ error: 'AI service returned unexpected response structure.' }) 
            };
        }
        
        // --- Clean up and parse the response from the LLM ---
        const rawText = geminiData.candidates[0].content.parts[0].text;
        
        // Enhanced response cleaning
        const cleanLLMResponse = (rawText) => {
            // Remove markdown code blocks
            let cleaned = rawText.replace(/```json\s*\n?|```\s*\n?/gi, '');
            
            // Remove common LLM prefixes/suffixes
            cleaned = cleaned.replace(/^(here is|here's|the json|result:|answer:)\s*/gi, '');
            cleaned = cleaned.replace(/\s*(that's it|hope this helps|let me know).*$/gi, '');
            
            // Extract JSON object if surrounded by text
            const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                cleaned = jsonMatch[0];
            }
            
            return cleaned.trim();
        };

        const jsonText = cleanLLMResponse(rawText);
        
        // Safe JSON parsing with error handling
        let mapping;
        try {
            mapping = JSON.parse(jsonText);
        } catch (parseError) {
            console.error('JSON Parse Error:', parseError);
            console.error('Raw LLM Response:', rawText);
            console.error('Cleaned JSON Text:', jsonText);
            return { 
                statusCode: 500, 
                body: JSON.stringify({ 
                    error: 'The AI returned an invalid response. Please try again.' 
                }) 
            };
        }

        // Validate response structure
        if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) {
            return { 
                statusCode: 500, 
                body: JSON.stringify({ 
                    error: 'The AI returned an unexpected response format.' 
                }) 
            };
        }

        // Validate that values are expected field types
        const validFields = ['Business Name', 'Address', 'Phone', 'Email'];
        const cleanMapping = {};
        
        Object.entries(mapping).forEach(([key, value]) => {
            if (validFields.includes(value)) {
                cleanMapping[key] = value;
            } else {
                console.warn(`AI returned unexpected field mapping: ${key} -> ${value}`);
            }
        });

        if (Object.keys(cleanMapping).length === 0) {
            throw new Error("The AI could not identify standard business fields in your spreadsheet.");
        }

        // Return the final, clean mapping object.
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mapping: cleanMapping }),
        };

    } catch (error) {
        console.error('Intelligent Mapper Function Error:', error);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: error.message }) 
        };
    }
};
