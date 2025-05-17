import fetch from 'node-fetch';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import express from 'express';

// Load environment variables
dotenv.config();

console.log(process.env.OPENAI_API_KEY);

// OpenAI configuration
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const USERNAME = 'tester';
const PASSWORD = '574e112a';
const BASE_URL = 'https://xyz.ag3nts.org';
const PORT = 3000;

function startServer(html) {
    const app = express();
    
    app.get('/', (req, res) => {
        res.send(html);
    });

    app.listen(PORT, () => {
        console.log(`Server is running at http://localhost:${PORT}`);
    });
}

async function getAnswerFromOpenAI(question) {
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "You are a helpful agent, who will provide concise, short answers to the questions. If there is a question about the year of some event, answer with JUST the year, not with full date"
                },
                {
                    role: "user",
                    content: question
                }
            ],
            temperature: 0.7,
            max_tokens: 150
        });

        return completion.choices[0].message.content.trim();
    } catch (error) {
        console.error('Error getting answer from OpenAI:', error);
        throw error;
    }
}

async function main() {
    try {
        // 1. Fetch HTML
        const response = await fetch(BASE_URL);
        const html = await response.text();
        console.log(html);

        // 2. Extract question using regex
        const questionRegex = /<p id="human-question">Question:\s*<br>?(.*?)<\/p>/i;
        const match = html.match(questionRegex);
        
        if (!match || !match[1]) {
            throw new Error('Question not found in the HTML');
        }
        
        const questionText = match[1].trim();
        console.log('Retrieved question:', questionText);

        // 3. Get answer from OpenAI
        const answer = await getAnswerFromOpenAI(questionText);
        console.log('Answer from OpenAI:', answer);

        // 4. Send POST request with the answer
        const postResponse = await fetch(`${BASE_URL}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                username: USERNAME,
                password: PASSWORD,
                answer: answer
            }).toString()
        });

        // Get response as text
        const responseText = await postResponse.text();
        console.log('Server response:', responseText);

        // If the response looks like HTML, start the Express server
        if (responseText.trim().toLowerCase().startsWith('<!doctype html') || 
            responseText.trim().toLowerCase().startsWith('<html')) {
            console.log('Received HTML response. Starting Express server...');
            startServer(responseText);
        } else {
            // Try to parse as JSON if it's not HTML
            try {
                const result = JSON.parse(responseText);
                console.log('Parsed response:', result);
            } catch (error) {
                console.log('Response is neither HTML nor JSON format');
            }
        }

    } catch (error) {
        console.error('Error in main process:', error);
        process.exit(1);
    }
}

main(); 