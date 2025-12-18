import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      console.warn(`Unauthorized access attempt by user ${user.id}`);
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Admin user ${user.id} accessing question generation`);

    const { subject, level, questionCount, questionType, category, description } = await req.json();

    // Input validation
    if (!subject || typeof subject !== 'string' || subject.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Invalid subject' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!level || typeof level !== 'string' || !['Beginner', 'Intermediate', 'Advanced'].includes(level)) {
      return new Response(
        JSON.stringify({ error: 'Level must be Beginner, Intermediate, or Advanced' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (typeof questionCount !== 'number' || questionCount < 1 || questionCount > 20) {
      return new Response(
        JSON.stringify({ error: 'Question count must be between 1 and 20' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!questionType || typeof questionType !== 'string' || !['multiple-choice', 'fill-blank', 'mixed'].includes(questionType)) {
      return new Response(
        JSON.stringify({ error: 'Invalid question type. Must be multiple-choice, fill-blank, or mixed' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const validCategories = ['Reading', 'Listening', 'Writing', 'Speaking', 'Grammar', 'Vocabulary', 'Logic', 'Problem Solving', 'Critical Thinking'];
    if (!category || typeof category !== 'string' || !validCategories.includes(category)) {
      return new Response(
        JSON.stringify({ error: 'Invalid category' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (description && (typeof description !== 'string' || description.length > 1000)) {
      return new Response(
        JSON.stringify({ error: 'Description must be less than 1000 characters' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    console.log('Generating questions:', { subject, level, questionCount, questionType, category, description });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are an expert Cambridge curriculum question writer specializing in ${subject}.
Your task is to generate high-quality ${category} questions at ${level} level.

Generate exactly ${questionCount} questions.
${questionType === 'mixed' ? 'Mix the question types: approximately 60% multiple-choice and 40% fill-in-the-blank.' : `ALL questions must be type: ${questionType}`}

CRITICAL: Return ONLY valid JSON, no markdown, no explanations. Format:
{
  "questions": [
    {
      "id": "q1",
      "type": "multiple-choice",
      "question": "The question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option B",
      "explanation": "Why this answer is correct"
    },
    {
      "id": "q2",
      "type": "fill-blank",
      "question": "The question text with a blank: _______",
      "correctAnswer": "the actual answer text",
      "explanation": "Why this answer is correct"
    }
  ]
}

Guidelines:
- Focus specifically on ${category} skills
- Make questions appropriate for ${level} level
- Ensure questions are clear and unambiguous
- Provide detailed explanations
- Use realistic scenarios when appropriate

For MULTIPLE-CHOICE questions:
- ALWAYS include "type": "multiple-choice"
- Include exactly 4 options in the "options" array
- correctAnswer MUST BE THE EXACT TEXT of the correct option from the options array (NOT the index number)
- VARY the position of the correct answer - use all positions roughly equally
- DO NOT always put the correct answer at position 1 or 2
- Example: if options are ["Red", "Blue", "Green", "Yellow"] and Blue is correct, set "correctAnswer": "Blue"

For FILL-IN-THE-BLANK questions:
- ALWAYS include "type": "fill-blank"
- Do NOT include an "options" field
- correctAnswer is the ACTUAL TEXT of the answer
- Make the blank clear with _______ in the question`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: description || `Generate ${questionCount} ${category} questions for ${subject} at ${level} level.` }
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limits exceeded, please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required, please add funds to your Lovable AI workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('AI gateway error');
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    console.log('AI response:', content);

    // Parse the JSON response
    let parsedContent;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        parsedContent = JSON.parse(jsonMatch[1]);
      } else {
        parsedContent = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Failed to parse AI response as JSON');
    }

    return new Response(JSON.stringify(parsedContent), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in generate-questions function:', error);
    return new Response(JSON.stringify({ error: error.message || 'Unknown error occurred' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
