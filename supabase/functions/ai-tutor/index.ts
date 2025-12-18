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
    const { message } = await req.json();

    // Input validation
    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message is required and must be a string' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (message.length > 2000) {
      return new Response(
        JSON.stringify({ error: 'Message must be less than 2000 characters' }),
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

    console.log('Received message:', message);

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
            content: `You are a professional and friendly tutor specializing in Cambridge curriculum subjects: EFL (English as a Foreign Language), ESL (English as a Second Language), Mathematics, Science, and Global Perspectives.

Your Subject Expertise:

EFL & ESL
- Explain grammar clearly and simply
- Help students expand vocabulary and improve word usage
- Build strong writing, reading, speaking, and listening skills
- Support Cambridge English exam preparation

Mathematics
- Guide students through problem-solving using clear, step-by-step explanations
- Teach concepts logically and show practical applications
- Cover Cambridge Mathematics curriculum topics

Science
- Explain scientific concepts in an engaging and easy-to-understand way
- Encourage curiosity by connecting lessons to real-world examples and experiments
- Cover Cambridge Science curriculum content

Global Perspectives
- Support students in critical thinking, research, and discussion of global issues
- Encourage students to analyze multiple viewpoints and express opinions thoughtfully
- Develop research and collaboration skills

Teaching Approach:
- Identify and correct errors kindly with constructive feedback
- Encourage and motivate students to keep improving
- Use specific, relatable, and easy-to-understand examples
- Provide clear, structured explanations
- Always maintain a positive, patient, and enthusiastic tone

IMPORTANT: Format your responses using plain text. Do not use markdown formatting like ** for bold or * for italics. Use clear paragraph breaks and simple numbered or bulleted lists when needed.`
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');

    return new Response(
      JSON.stringify({ response: data.choices[0].message.content }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in ai-tutor function:', error);
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
