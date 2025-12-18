import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Question {
  id: string;
  type: string;
  question: string;
  correctAnswer: string | number;
  explanation: string;
  options?: string[];
}

interface Part {
  id: string;
  title: string;
  context?: string;
  questions: Question[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { testId, userAnswers } = await req.json();

    // Input validation
    if (!testId || typeof testId !== 'string' || testId.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Invalid testId' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!userAnswers || typeof userAnswers !== 'object' || Array.isArray(userAnswers)) {
      return new Response(
        JSON.stringify({ error: 'userAnswers must be an object' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Fetch the full test with answers using service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const response = await fetch(`${supabaseUrl}/rest/v1/tests?id=eq.${testId}`, {
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch test');
    }

    const tests = await response.json();
    const test = tests[0];

    if (!test) {
      return new Response(
        JSON.stringify({ error: 'Test not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Extract all questions from either format
    let allQuestions: Question[] = [];
    if (test.parts) {
      allQuestions = (test.parts as Part[]).flatMap(part => part.questions);
    } else if (test.questions) {
      allQuestions = test.questions as Question[];
    }

    // Validate answers and build results
    const results = allQuestions.map(question => {
      const userAnswer = userAnswers[question.id];
      let isCorrect = false;

      // Handle both old (numeric index) and new (text) correctAnswer formats
      if (question.type === "multiple-choice" && typeof question.correctAnswer === "number" && question.options) {
        // Old format: correctAnswer is numeric index
        // UserAnswer could be either index (old) or text (new)
        if (typeof userAnswer === "number") {
          isCorrect = userAnswer === question.correctAnswer;
        } else {
          // User selected text option, compare with option at correct index
          const correctOptionText = question.options[question.correctAnswer];
          isCorrect = String(userAnswer || "").toLowerCase().trim() === correctOptionText?.toLowerCase().trim();
        }
      } else {
        // New format: correctAnswer is text for both multiple-choice and fill-in-the-blank
        const userAnswerStr = String(userAnswer || "").toLowerCase().trim();
        const correctAnswerStr = String(question.correctAnswer).toLowerCase().trim();
        isCorrect = userAnswerStr === correctAnswerStr;
      }
      
      return {
        questionId: question.id,
        question: question.question,
        userAnswer: userAnswer ?? null,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        isCorrect,
      };
    });

    const score = results.filter(r => r.isCorrect).length;
    const totalQuestions = allQuestions.length;
    const percentage = (score / totalQuestions) * 100;

    console.log(`Test ${testId} validated: ${score}/${totalQuestions}`);

    return new Response(
      JSON.stringify({
        score,
        totalQuestions,
        percentage,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in validate-test-answers function:', error);
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