export interface Question {
    id: string;
    question: string;
    options: string[];
    answer: string;
    explanation?: string;

    __subject?: string;
    __sourceText?: string;
}

export interface QuestionBlock {
    text: string;
    subject: string;
    questions: Question[];
}
