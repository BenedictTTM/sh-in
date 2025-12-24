
import axios from 'axios';

async function updateQuiz() {
    const quizId = 5; // As per the log
    const url = `http://localhost:4000/v1/admin/quizzes/${quizId}`;

    // Payload mimicking what the frontend sends
    // Based on admin/app/quiz/page.tsx
    const payload = {
        title: "Updated Quiz Title",
        description: "Updated Description",
        subject: "maths",
        timeLimit: 60,
        passingScore: 50,
        maxAttempts: 3,
        questions: [
            {
                id: 1, // Assuming question ID 1 exists
                text: "Updated Question Text",
                explanation: "Updated Explanation",
                points: 10,
                order: 0,
                choices: [
                    {
                        id: 1, // Assuming choice ID 1 exists
                        text: "Option 1",
                        order: 0,
                        // _delete: false // Implicitly undefined
                    },
                    {
                        id: 2,
                        text: "Option 2",
                        order: 1
                    }
                ],
                correctChoiceIndexes: [0],
                // _delete: false
            }
        ]
    };

    try {
        console.log(`Sending PUT request to ${url}...`);
        const response = await axios.put(url, payload);
        console.log('Success!', response.data);
    } catch (error: any) {
        if (error.response) {
            console.error('Error Status:', error.response.status);
            console.error('Error Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error Message:', error.message);
            console.error('Full Error:', error);
        }
    }
}

updateQuiz();
