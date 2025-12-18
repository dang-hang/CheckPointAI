import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { testTitle, score, totalQuestions, questions, userAnswers } = await req.json();

    // Input validation
    if (!testTitle || typeof testTitle !== 'string' || testTitle.length > 200) {
      return new Response(
        JSON.stringify({ error: 'Invalid test title' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (typeof score !== 'number' || typeof totalQuestions !== 'number') {
      return new Response(
        JSON.stringify({ error: 'Score and totalQuestions must be numbers' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!Array.isArray(questions) || questions.length === 0 || questions.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Questions must be an array with 1-100 items' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Analyzing test results for:', testTitle);

    // Prepare detailed feedback for each question
    const detailedFeedback = questions.map((q: any, index: number) => {
      const userAnswer = userAnswers[q.id];
      let isCorrect = false;
      let displayAnswer = "(No answer)";
      let displayCorrect = "";

      // Handle both old (numeric index) and new (text) correctAnswer formats
      if (q.type === "multiple-choice" && typeof q.correctAnswer === "number" && q.options) {
        // Old format: correctAnswer is numeric index
        if (typeof userAnswer === "number") {
          isCorrect = userAnswer === q.correctAnswer;
          displayAnswer = q.options[userAnswer] || "(No answer)";
        } else {
          // User selected text option, compare with option at correct index
          const correctOptionText = q.options[q.correctAnswer];
          isCorrect = String(userAnswer || "").toLowerCase().trim() === correctOptionText?.toLowerCase().trim();
          displayAnswer = userAnswer || "(No answer)";
        }
        displayCorrect = q.options[q.correctAnswer];
      } else if (q.type === "multiple-choice" && q.options) {
        // New format: correctAnswer is text
        // UserAnswer could be either index (shouldn't happen but be safe) or text
        if (typeof userAnswer === "number" && q.options[userAnswer]) {
          displayAnswer = q.options[userAnswer];
          isCorrect = q.options[userAnswer].toLowerCase().trim() === String(q.correctAnswer).toLowerCase().trim();
        } else {
          const userAnswerStr = String(userAnswer || "").toLowerCase().trim();
          const correctAnswerStr = String(q.correctAnswer).toLowerCase().trim();
          isCorrect = userAnswerStr === correctAnswerStr;
          displayAnswer = userAnswer || "(No answer)";
        }
        displayCorrect = q.correctAnswer;
      } else {
        // Fill-in-the-blank or text answer
        const userAnswerStr = String(userAnswer || "").toLowerCase().trim();
        const correctAnswerStr = String(q.correctAnswer || "").toLowerCase().trim();
        isCorrect = userAnswerStr === correctAnswerStr;
        displayAnswer = userAnswer || "(No answer)";
        displayCorrect = q.correctAnswer;
      }
      
      return `
Question ${index + 1}: ${isCorrect ? "✓ Correct" : "✗ Incorrect"}
Question: ${q.question}
Student's answer: ${displayAnswer}
Correct answer: ${displayCorrect}
`;
    }).join('\n');

    const prompt = `You are a professional English teacher analyzing a student's test results.

TEST: ${testTitle}
SCORE: ${score}/${totalQuestions} (${((score/totalQuestions) * 100).toFixed(0)}%)

QUESTION DETAILS:
${detailedFeedback}

Please analyze the results and provide:

1. **Overall Assessment**: Comment on the student's level of understanding
2. **Strengths**: What the student did well
3. **Areas for Improvement**: Common errors and their causes
4. **Specific Advice**: 3-4 practical tips to improve (e.g., which grammar to study more, what skills to practice)
5. **Suggested Exercises**: Recommend practice methods to address weaknesses

Write in an encouraging, positive, and detailed manner.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an experienced English teacher who specializes in analyzing and providing constructive feedback to students.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const analysis = data.choices[0].message.content;
    
    console.log('Analysis completed successfully');

    return new Response(
      JSON.stringify({ analysis }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in analyze-test-results function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
