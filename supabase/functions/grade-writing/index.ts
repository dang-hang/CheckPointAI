import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { submissionId } = await req.json();

    if (!submissionId) {
      return new Response(
        JSON.stringify({ error: 'Submission ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch submission with prompt
    const { data: submission, error: submissionError } = await supabaseClient
      .from('writing_submissions')
      .select('*, writing_prompts(*)')
      .eq('id', submissionId)
      .single();

    if (submissionError || !submission) {
      console.error('Error fetching submission:', submissionError);
      return new Response(
        JSON.stringify({ error: 'Submission not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user owns this submission
    if (submission.student_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = submission.writing_prompts;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Construct AI grading prompt
    const systemPrompt = `You are an expert English writing instructor. Grade student writing submissions based on the provided rubric. Provide:
1. Detailed constructive feedback
2. Specific strengths and areas for improvement
3. A numerical grade out of 100

Be encouraging but honest. Focus on helping the student improve.`;

    const userPrompt = `
WRITING PROMPT:
${prompt.prompt}

RUBRIC:
${prompt.rubric}

STUDENT SUBMISSION (${submission.word_count} words):
${submission.content}

Please grade this submission and provide detailed feedback.`;

    // Call AI Gateway
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits depleted. Please contact administrator.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const feedback = aiData.choices[0].message.content;

    // Extract grade from feedback (look for patterns like "Grade: 85/100" or "Score: 85")
    const gradeMatch = feedback.match(/(?:grade|score):\s*(\d+)(?:\/100)?/i);
    const aiGrade = gradeMatch ? parseFloat(gradeMatch[1]) : 75; // Default to 75 if not found

    // Update submission with AI feedback
    const { error: updateError } = await supabaseClient
      .from('writing_submissions')
      .update({
        ai_feedback: feedback,
        ai_grade: aiGrade,
        status: 'ai_graded'
      })
      .eq('id', submissionId);

    if (updateError) {
      console.error('Error updating submission:', updateError);
      throw new Error('Failed to save AI feedback');
    }

    return new Response(
      JSON.stringify({ 
        feedback, 
        grade: aiGrade,
        status: 'success'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in grade-writing function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});