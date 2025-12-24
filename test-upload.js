const fs = require('fs');
const path = require('path');

// Configuration
const API_URL = 'http://localhost:3001/v1/quizzes/upload'; // Adjusted for version '1' prefix in controller
const FILE_PATH = path.join(__dirname, 'test-data', 'quizzes.json');

async function uploadQuizzes() {
    if (!fs.existsSync(FILE_PATH)) {
        console.error(`File not found: ${FILE_PATH}`);
        process.exit(1);
    }

    const boundary = '--------------------------' + Date.now().toString(16);

    // Construct body for multipart/form-data
    const fileContent = fs.readFileSync(FILE_PATH);

    // Custom multipart body construction since we don't want external deps like 'form-data' if possible, 
    // but keeping it simple with fetch + FormData if node version supports it (Node 18+).
    // Assuming Node 18+ which has global fetch and FormData.

    if (typeof FormData === 'undefined') {
        console.log("Global FormData not found (Node < 18?), using manual fetch with boundary.");
        // This is complex. Let's assume user has recent node or we use a simpler approach.
        // Actually, creating a simpler test using 'curl' via child_process is safer.
    }
}

// Switching to child_process curl for reliability across node versions without deps
const { exec } = require('child_process');

const command = `curl -X POST "${API_URL}" -H "Content-Type: multipart/form-data" -F "file=@${FILE_PATH}"`;

console.log(`Executing: ${command}`);

exec(command, (error, stdout, stderr) => {
    if (error) {
        console.error(`exec error: ${error}`);
        return;
    }
    console.log(`stdout: ${stdout}`);
    if (stderr) console.error(`stderr: ${stderr}`);
});
