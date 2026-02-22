export class AttemptCompletedEvent {
    constructor(
        public readonly userId: number,
        public readonly quizId: number,
        public readonly attemptId: number,
        public readonly score: number,
        public readonly maxScore: number,
        public readonly passed: boolean,
        public readonly totalAnswers: number,
        public readonly correctAnswers: number,
    ) { }
}
