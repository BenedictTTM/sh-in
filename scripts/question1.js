const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Question 1 data...');

    // 1. Create (or find) the Quiz
    // We'll assume a "General Mathematics" quiz for this set.
    // We need a user ID for 'createdById'. We'll try to find the first user, or create a dummy one if none exists.
    let creator = await prisma.user.findFirst();
    if (!creator) {
        console.log('No user found, creating a dummy admin user...');
        creator = await prisma.user.create({
            data: {
                email: 'admin@example.com',
                password: 'hashedpassword123', // In real app, hash this
                firstName: 'Admin',
                lastName: 'User',
            }
        });
    }

    const quiz = await prisma.quiz.create({
        data: {
            title: 'General Mathematics Practice',
            description: 'A collection of Algebra, Geometry, and Statistics problems.',
            createdById: creator.id,
            isPublished: true,
            questions: {
                create: [
                    // Question 1 (Algebra)
                    {
                        text: 'Solve for x: 2(3x - 4) - 5 = x + 7',
                        explanation: 'Expand the bracket: 6x - 8 - 5 = x + 7. Simplify: 6x - 13 = x + 7. Subtract x: 5x = 20. Divide by 5: x = 4.',
                        solution: 'Step 1: Expand the bracket\n2(3x - 4) - 5 = x + 7\n6x - 8 - 5 = x + 7\n\nStep 2: Simplify the left side\n6x - 13 = x + 7\n\nStep 3: Collect x terms on one side\n6x - x = 7 + 13\n5x = 20\n\nStep 4: Solve for x\nx = 20 / 5\nx = 4',
                        points: 10,
                        order: 1,
                        type: 'single_choice',
                        choices: {
                            create: [
                                { text: 'x = 4', isCorrect: true, order: 1 },
                                { text: 'x = 3', isCorrect: false, order: 2 },
                                { text: 'x = 5', isCorrect: false, order: 3 },
                                { text: 'x = 2', isCorrect: false, order: 4 },
                            ]
                        }
                    },
                    // Question 2 (Simultaneous Equations)
                    {
                        text: 'Solve the simultaneous equations:\n2x + y = 11\nx - y = 1',
                        explanation: 'Add both equations: (2x+y) + (x-y) = 11+1 => 3x=12 => x=4. Substitute x=4 into x-y=1 => 4-y=1 => y=3.',
                        solution: 'Step 1: Add the two equations to eliminate y\n(2x + y) + (x - y) = 11 + 1\n3x = 12\n\nStep 2: Solve for x\nx = 12 / 3\nx = 4\n\nStep 3: Substitute x back into the second equation\n4 - y = 1\n-y = 1 - 4\n-y = -3\ny = 3\n\nAnswer: x = 4, y = 3',
                        points: 10,
                        order: 2,
                        type: 'single_choice',
                        choices: {
                            create: [
                                { text: 'x = 4, y = 3', isCorrect: true, order: 1 },
                                { text: 'x = 3, y = 4', isCorrect: false, order: 2 },
                                { text: 'x = 5, y = 2', isCorrect: false, order: 3 },
                                { text: 'x = 2, y = 5', isCorrect: false, order: 4 },
                            ]
                        }
                    },
                    // Question 3 (Indices)
                    {
                        text: 'Simplify: (3^5 × 3^2) / 3^4',
                        explanation: 'Add indices in numerator: 3^(5+2) = 3^7. Subtract indices when dividing: 3^(7-4) = 3^3. 3^3 = 27.',
                        solution: 'Step 1: Apply the multiplication law of indices (add powers)\n3^5 × 3^2 = 3^(5+2) = 3^7\n\nStep 2: Apply the division law of indices (subtract powers)\n3^7 / 3^4 = 3^(7-4) = 3^3\n\nStep 3: Calculate the value\n3^3 = 3 × 3 × 3 = 27',
                        points: 10,
                        order: 3,
                        type: 'single_choice',
                        choices: {
                            create: [
                                { text: '27', isCorrect: true, order: 1 },
                                { text: '9', isCorrect: false, order: 2 },
                                { text: '81', isCorrect: false, order: 3 },
                                { text: '3', isCorrect: false, order: 4 },
                            ]
                        }
                    },
                    // Question 4 (Quadratic Equation)
                    {
                        text: 'Solve: x² - 7x + 10 = 0',
                        explanation: 'Find two numbers adding to -7 and multiplying to 10: -2 and -5. (x-2)(x-5)=0 -> x=2 or x=5.',
                        solution: 'Step 1: Factorize the quadratic\nFind two numbers that multiply to 10 and add to -7.\nThe numbers are -2 and -5.\n\nStep 2: Write in factored form\n(x - 2)(x - 5) = 0\n\nStep 3: Solve for x\nx - 2 = 0 => x = 2\nx - 5 = 0 => x = 5',
                        points: 10,
                        order: 4,
                        type: 'single_choice',
                        choices: {
                            create: [
                                { text: 'x = 2 or x = 5', isCorrect: true, order: 1 },
                                { text: 'x = -2 or x = -5', isCorrect: false, order: 2 },
                                { text: 'x = 2 or x = -5', isCorrect: false, order: 3 },
                                { text: 'x = -2 or x = 5', isCorrect: false, order: 4 },
                            ]
                        }
                    },
                    // Question 5 (Geometry – Angles)
                    {
                        text: 'The angles of a triangle are in the ratio 2:3:4. Find the largest angle.',
                        explanation: 'Total ratio = 9. Total angle = 180. One part = 180/9 = 20. Largest part = 4 * 20 = 80.',
                        solution: 'Step 1: Find the total number of parts in the ratio\n2 + 3 + 4 = 9 parts\n\nStep 2: Relate to the sum of angles in a triangle\nTotal sum = 180 degrees\nValue of 1 part = 180 / 9 = 20 degrees\n\nStep 3: Calculate the largest angle\nThe largest share is 4 parts.\n4 × 20 = 80 degrees',
                        points: 10,
                        order: 5,
                        type: 'single_choice',
                        choices: {
                            create: [
                                { text: '80°', isCorrect: true, order: 1 },
                                { text: '60°', isCorrect: false, order: 2 },
                                { text: '40°', isCorrect: false, order: 3 },
                                { text: '100°', isCorrect: false, order: 4 },
                            ]
                        }
                    },
                    // Question 6 (Mensuration – Circle)
                    {
                        text: 'Find the circumference of a circle of radius 14 cm. (Take π = 22/7)',
                        explanation: 'Circumference = 2πr = 2 * (22/7) * 14 = 2 * 22 * 2 = 88 cm.',
                        solution: 'Step 1: Identify the formula\nC = 2πr\n\nStep 2: Substitute the values\nr = 14, π = 22/7\nC = 2 × (22/7) × 14\n\nStep 3: Simplify\nC = 2 × 22 × (14/7)\nC = 2 × 22 × 2\nC = 88 cm',
                        points: 10,
                        order: 6,
                        type: 'single_choice',
                        choices: {
                            create: [
                                { text: '88 cm', isCorrect: true, order: 1 },
                                { text: '44 cm', isCorrect: false, order: 2 },
                                { text: '154 cm', isCorrect: false, order: 3 },
                                { text: '616 cm', isCorrect: false, order: 4 },
                            ]
                        }
                    },
                    // Question 7 (Word Problem – Speed)
                    {
                        text: 'A car travels 120 km in 2 hours. Find its speed in km/h.',
                        explanation: 'Speed = Distance / Time = 120 / 2 = 60 km/h.',
                        solution: 'Step 1: Identify the formula\nSpeed = Distance / Time\n\nStep 2: Substitute values\nDistance = 120 km\nTime = 2 hours\n\nStep 3: Calculate\nSpeed = 120 / 2 = 60 km/h',
                        points: 10,
                        order: 7,
                        type: 'single_choice',
                        choices: {
                            create: [
                                { text: '60 km/h', isCorrect: true, order: 1 },
                                { text: '120 km/h', isCorrect: false, order: 2 },
                                { text: '30 km/h', isCorrect: false, order: 3 },
                                { text: '240 km/h', isCorrect: false, order: 4 },
                            ]
                        }
                    },
                    // Question 8 (Probability)
                    {
                        text: 'A bag contains 5 red balls and 3 blue balls. One ball is picked at random. Find the probability that it is blue.',
                        explanation: 'Total balls = 5 + 3 = 8. Blue balls = 3. Probability = 3/8.',
                        solution: 'Step 1: Find total number of outcomes\nRed = 5, Blue = 3\nTotal = 5 + 3 = 8\n\nStep 2: Find favorable outcomes (Blue)\nBlue = 3\n\nStep 3: Calculate probability\nP(Blue) = Favorable / Total = 3/8',
                        points: 10,
                        order: 8,
                        type: 'single_choice',
                        choices: {
                            create: [
                                { text: '3/8', isCorrect: true, order: 1 },
                                { text: '5/8', isCorrect: false, order: 2 },
                                { text: '1/4', isCorrect: false, order: 3 },
                                { text: '1/2', isCorrect: false, order: 4 },
                            ]
                        }
                    },
                    // Question 9 (Statistics)
                    {
                        text: 'Find the mean of the numbers: 4, 7, 10, 13, 16.',
                        explanation: 'Sum = 4+7+10+13+16 = 50. Count = 5. Mean = 50/5 = 10.',
                        solution: 'Step 1: Sum the numbers\n4 + 7 + 10 + 13 + 16 = 50\n\nStep 2: Count the numbers\nThere are 5 numbers.\n\nStep 3: Divide Sum by Count\nMean = 50 / 5 = 10',
                        points: 10,
                        order: 9,
                        type: 'single_choice',
                        choices: {
                            create: [
                                { text: '10', isCorrect: true, order: 1 },
                                { text: '13', isCorrect: false, order: 2 },
                                { text: '7', isCorrect: false, order: 3 },
                                { text: '50', isCorrect: false, order: 4 },
                            ]
                        }
                    },
                    // Question 10 (Variation)
                    {
                        text: 'If y varies directly as x and y=12 when x=4, find y when x=10.',
                        explanation: 'y = kx. 12 = 4k => k=3. Then y = 3(10) = 30.',
                        solution: 'Step 1: Write the equation of variation\ny = kx\n\nStep 2: Find k using initial values\n12 = k(4)\nk = 12 / 4 = 3\n\nStep 3: Use k to find new y\ny = 3(10) = 30',
                        points: 10,
                        order: 10,
                        type: 'single_choice',
                        choices: {
                            create: [
                                { text: '30', isCorrect: true, order: 1 },
                                { text: '40', isCorrect: false, order: 2 },
                                { text: '48', isCorrect: false, order: 3 },
                                { text: '3', isCorrect: false, order: 4 },
                            ]
                        }
                    }
                ]
            }
        }
    });

    console.log(`Created Quiz: ${quiz.title} with ID: ${quiz.id}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
