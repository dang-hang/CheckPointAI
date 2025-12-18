import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, classId } = await req.json();

    if (!email || !classId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, classId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authenticated teacher
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify teacher has access to this class
    const { data: teacherAccess, error: accessError } = await supabase
      .from('teacher_class')
      .select('id')
      .eq('teacher_id', user.id)
      .eq('class_id', classId)
      .maybeSingle();

    if (accessError || !teacherAccess) {
      return new Response(
        JSON.stringify({ error: 'You do not have access to this class' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find user by email using admin API
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error('Error listing users:', userError);
      return new Response(
        JSON.stringify({ error: 'Failed to search for user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const studentUser = users?.find((u: any) => u.email?.toLowerCase() === email.trim().toLowerCase());

    if (!studentUser) {
      return new Response(
        JSON.stringify({ error: 'No user found with that email. Make sure they have signed up first.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if student is already in the class
    const { data: existing } = await supabase
      .from('student_class')
      .select('id')
      .eq('student_id', studentUser.id)
      .eq('class_id', classId)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ error: 'This student is already enrolled in the class' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add student to class
    const { error: insertError } = await supabase
      .from('student_class')
      .insert({
        student_id: studentUser.id,
        class_id: classId
      });

    if (insertError) {
      console.error('Error adding student to class:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to add student to class' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        student: {
          id: studentUser.id,
          email: studentUser.email
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in add-student-to-class function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});