export interface Question {
  id: string;
  type: "multiple-choice" | "fill-blank" | "true-false";
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

export interface Test {
  id: string;
  category: "IELTS" | "Checkpoint" | "ESL";
  title: string;
  description: string;
  duration: number; // minutes
  questions: Question[];
  difficulty: "Beginner" | "Intermediate" | "Advanced";
}

export const sampleTests: Test[] = [
  {
    id: "ielts-reading-1",
    category: "IELTS",
    title: "IELTS Reading Practice - Academic",
    description: "Practice reading comprehension with academic passages",
    duration: 20,
    difficulty: "Intermediate",
    questions: [
      {
        id: "q1",
        type: "multiple-choice",
        question: "What is the main idea of the passage about climate change?",
        options: [
          "Climate change is not a serious problem",
          "Human activities are the primary cause of climate change",
          "Climate has always changed naturally",
          "Scientists disagree about climate change"
        ],
        correctAnswer: "Human activities are the primary cause of climate change",
        explanation: "The passage clearly states that scientific evidence shows human activities, particularly carbon emissions, are the main driver of recent climate change."
      },
      {
        id: "q2",
        type: "true-false",
        question: "According to the text, renewable energy sources produce zero carbon emissions.",
        correctAnswer: "True",
        explanation: "The passage mentions that solar and wind power are examples of renewable energy that produce minimal to zero carbon emissions."
      },
      {
        id: "q3",
        type: "fill-blank",
        question: "The Paris Agreement aims to limit global temperature rise to _____ degrees Celsius above pre-industrial levels.",
        correctAnswer: "1.5",
        explanation: "The Paris Agreement's goal is to limit warming to well below 2°C, preferably to 1.5°C."
      }
    ]
  },
  {
    id: "checkpoint-grammar-1",
    category: "Checkpoint",
    title: "Checkpoint B2 First - Grammar & Vocabulary",
    description: "Test your grammar and vocabulary at B2 level",
    duration: 15,
    difficulty: "Intermediate",
    questions: [
      {
        id: "q1",
        type: "multiple-choice",
        question: "I wish I _____ more time to study yesterday.",
        options: [
          "have",
          "had",
          "had had",
          "have had"
        ],
        correctAnswer: "had had",
        explanation: "We use 'wish + past perfect' to express regret about past situations."
      },
      {
        id: "q2",
        type: "multiple-choice",
        question: "By the time we arrived, the movie _____ already _____.",
        options: [
          "has / started",
          "had / started",
          "was / starting",
          "is / starting"
        ],
        correctAnswer: "had / started",
        explanation: "Past perfect is used for an action that was completed before another past action."
      },
      {
        id: "q3",
        type: "fill-blank",
        question: "She is good _____ playing the piano.",
        correctAnswer: "at",
        explanation: "We use 'good at' to express skill or ability in something."
      }
    ]
  },
  {
    id: "esl-basic-1",
    category: "ESL",
    title: "ESL Basic Vocabulary",
    description: "Practice common English vocabulary for daily life",
    duration: 10,
    difficulty: "Beginner",
    questions: [
      {
        id: "q1",
        type: "multiple-choice",
        question: "What do you say when you meet someone for the first time?",
        options: [
          "Goodbye",
          "Nice to meet you",
          "See you later",
          "Take care"
        ],
        correctAnswer: "Nice to meet you",
        explanation: "'Nice to meet you' is the standard greeting when meeting someone for the first time."
      },
      {
        id: "q2",
        type: "multiple-choice",
        question: "Which word means 'very big'?",
        options: [
          "tiny",
          "small",
          "huge",
          "little"
        ],
        correctAnswer: "huge",
        explanation: "'Huge' means extremely large or big."
      },
      {
        id: "q3",
        type: "fill-blank",
        question: "I _____ to school every day. (go)",
        correctAnswer: "go",
        explanation: "For daily routines with 'I', we use the base form of the verb."
      }
    ]
  },
  {
    id: "ielts-listening-1",
    category: "IELTS",
    title: "IELTS Listening Practice",
    description: "Practice listening comprehension skills",
    duration: 15,
    difficulty: "Intermediate",
    questions: [
      {
        id: "q1",
        type: "multiple-choice",
        question: "What is the speaker's main purpose?",
        options: [
          "To give directions",
          "To describe a product",
          "To tell a story",
          "To explain a process"
        ],
        correctAnswer: "To explain a process",
        explanation: "The speaker systematically explains how something works step by step."
      },
      {
        id: "q2",
        type: "fill-blank",
        question: "The meeting will be held on _____ at 3 PM.",
        correctAnswer: "Friday",
        explanation: "The speaker mentions the meeting is scheduled for Friday afternoon."
      }
    ]
  },
  {
    id: "checkpoint-reading-1",
    category: "Checkpoint",
    title: "Checkpoint A2 Key - Reading",
    description: "Reading comprehension at A2 level",
    duration: 12,
    difficulty: "Beginner",
    questions: [
      {
        id: "q1",
        type: "true-false",
        question: "The shop opens at 9 AM on weekdays.",
        correctAnswer: "True",
        explanation: "According to the notice, the shop opens at 9 AM Monday to Friday."
      },
      {
        id: "q2",
        type: "multiple-choice",
        question: "What is the text about?",
        options: [
          "A restaurant menu",
          "A job advertisement",
          "A movie review",
          "A travel guide"
        ],
        correctAnswer: "A job advertisement",
        explanation: "The text describes job requirements and how to apply."
      }
    ]
  },
  {
    id: "esl-conversation-1",
    category: "ESL",
    title: "ESL Daily Conversations",
    description: "Common phrases for everyday situations",
    duration: 8,
    difficulty: "Beginner",
    questions: [
      {
        id: "q1",
        type: "multiple-choice",
        question: "How do you ask for the price of something?",
        options: [
          "What's your name?",
          "How much is this?",
          "Where are you from?",
          "What time is it?"
        ],
        correctAnswer: "How much is this?",
        explanation: "'How much is this?' is used to ask about the price of items."
      },
      {
        id: "q2",
        type: "multiple-choice",
        question: "What's the correct response to 'Thank you'?",
        options: [
          "Hello",
          "You're welcome",
          "Goodbye",
          "Nice to meet you"
        ],
        correctAnswer: "You're welcome",
        explanation: "'You're welcome' is the polite response to 'Thank you'."
      }
    ]
  }
];
