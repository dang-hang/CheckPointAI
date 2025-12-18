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
    const { studentId, startDate, endDate, classId } = await req.json();

    if (!studentId || !startDate || !endDate) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: studentId, startDate, endDate' }),
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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authenticated user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify teacher has access to this student
    // First, check if user is a teacher
    const { data: teacherRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'teacher')
      .maybeSingle();

    if (!teacherRole) {
      return new Response(
        JSON.stringify({ error: 'Only teachers can generate progress reports' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the student's classes
    const { data: studentClasses } = await supabase
      .from('student_class')
      .select('class_id')
      .eq('student_id', studentId);

    if (!studentClasses || studentClasses.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Student is not enrolled in any classes' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const classIds = studentClasses.map(sc => sc.class_id);

    // Check if teacher is assigned to any of the student's classes
    const { data: teacherClasses } = await supabase
      .from('teacher_class')
      .select('class_id')
      .eq('teacher_id', user.id)
      .in('class_id', classIds);

    if (!teacherClasses || teacherClasses.length === 0) {
      return new Response(
        JSON.stringify({ error: 'You do not have access to this student' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch test results for the student in the date range
    // Add time to endDate to include the entire day
    const endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999);
    
    const { data: testResults, error: resultsError } = await supabase
      .from('test_results')
      .select('*')
      .eq('user_id', studentId)
      .gte('completed_at', startDate)
      .lte('completed_at', endDateTime.toISOString())
      .order('completed_at', { ascending: true });

    if (resultsError) {
      console.error('Error fetching test results:', resultsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch test results' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch writing submissions for the student in the date range
    const { data: writingSubmissions, error: writingError } = await supabase
      .from('writing_submissions')
      .select(`
        *,
        writing_prompts (
          title,
          difficulty,
          rubric
        )
      `)
      .eq('student_id', studentId)
      .gte('submitted_at', startDate)
      .lte('submitted_at', endDateTime.toISOString())
      .order('submitted_at', { ascending: true });

    if (writingError) {
      console.error('Error fetching writing submissions:', writingError);
    }

    if ((!testResults || testResults.length === 0) && (!writingSubmissions || writingSubmissions.length === 0)) {
      return new Response(
        JSON.stringify({ error: 'No test results or writing submissions found for this period' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get student and teacher profiles
    const { data: studentProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', studentId)
      .single();

    const { data: teacherProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    const studentName = studentProfile?.full_name || studentProfile?.email || 'Student';
    const teacherName = teacherProfile?.full_name || teacherProfile?.email || 'Teacher';

    // Prepare data for AI analysis
    const categoryStats = (testResults || []).reduce((acc: any, result: any) => {
      const cat = result.test_category;
      if (!acc[cat]) {
        acc[cat] = { scores: [], tests: [], totalQuestions: 0, correctAnswers: 0, type: 'test' };
      }
      acc[cat].scores.push(result.percentage);
      acc[cat].tests.push({
        title: result.test_title,
        score: result.score,
        total: result.total_questions,
        percentage: result.percentage,
        date: result.completed_at
      });
      acc[cat].totalQuestions += result.total_questions;
      acc[cat].correctAnswers += result.score;
      return acc;
    }, {});

    // Add writing submissions to the stats
    if (writingSubmissions && writingSubmissions.length > 0) {
      categoryStats['Writing'] = {
        type: 'writing',
        submissions: writingSubmissions.map((sub: any) => ({
          title: sub.writing_prompts?.title || 'Writing Task',
          aiGrade: sub.ai_grade,
          teacherGrade: sub.teacher_grade,
          wordCount: sub.word_count,
          feedback: sub.ai_feedback,
          teacherNotes: sub.teacher_notes,
          date: sub.submitted_at,
          status: sub.status
        })),
        totalSubmissions: writingSubmissions.length,
        averageAiGrade: writingSubmissions.filter((s: any) => s.ai_grade).length > 0
          ? (writingSubmissions.reduce((sum: number, s: any) => sum + (s.ai_grade || 0), 0) / 
             writingSubmissions.filter((s: any) => s.ai_grade).length)
          : null,
        averageTeacherGrade: writingSubmissions.filter((s: any) => s.teacher_grade).length > 0
          ? (writingSubmissions.reduce((sum: number, s: any) => sum + (s.teacher_grade || 0), 0) / 
             writingSubmissions.filter((s: any) => s.teacher_grade).length)
          : null
      };
    }

    // Build AI prompt
    const prompt = `You are an English language learning expert analyzing test performance for a student.

Student: ${studentName}
Teacher/Instructor: ${teacherName}
Analysis Period: ${startDate} to ${endDate}

Analyze the following student's test performance and provide a comprehensive progress report.

Performance Data:
${Object.entries(categoryStats).map(([category, stats]: [string, any]) => {
  if (stats.type === 'writing') {
    return `
Category: ${category}
- Number of writing submissions: ${stats.totalSubmissions}
- Average AI grade: ${stats.averageAiGrade ? stats.averageAiGrade.toFixed(1) + '/100' : 'Not graded'}
- Average teacher grade: ${stats.averageTeacherGrade ? stats.averageTeacherGrade.toFixed(1) + '/100' : 'Not graded'}
- Submissions: ${stats.submissions.map((s: any) => 
    `${s.title} (${s.teacherGrade || s.aiGrade || 'Pending'}${s.teacherGrade || s.aiGrade ? '/100' : ''}, ${s.wordCount} words)`
  ).join(', ')}`;
  } else {
    return `
Category: ${category}
- Number of tests taken: ${stats.tests.length}
- Average score: ${(stats.scores.reduce((a: number, b: number) => a + b, 0) / stats.scores.length).toFixed(1)}%
- Overall accuracy: ${((stats.correctAnswers / stats.totalQuestions) * 100).toFixed(1)}%
- Score progression: ${stats.scores.map((s: number) => s.toFixed(0) + '%').join(' → ')}
- Tests: ${stats.tests.map((t: any) => `${t.title} (${t.percentage.toFixed(0)}%)`).join(', ')}`;
  }
}).join('\n')}

Provide a detailed progress report with the following sections:

## 1. Overall Performance Summary
Brief overview of ${studentName}'s progress across all categories including tests and writing submissions.

## 2. Improvement Trends
Analyze score progression over time. Identify areas showing improvement and areas that need attention.

## 3. Strengths by Category
For each category (${Object.keys(categoryStats).join(', ')}), identify what ${studentName} does well.

## 4. Weaknesses by Category
For each category, identify specific areas where ${studentName} struggles.

## 5. Recommendations
Provide 3-5 specific, actionable recommendations for ${studentName}'s improvement.

IMPORTANT FORMATTING RULES:
- Use ## for main section headings
- Add a blank line before and after each heading
- Add a blank line between paragraphs
- Use bullet points (- or *) for lists
- Add a blank line before and after bullet lists
- Be specific, encouraging, and constructive
- Address the student directly when appropriate`;

    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an expert English language teacher who provides detailed, constructive feedback on student progress.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to generate report' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const reportContent = aiData.choices[0].message.content;

    // Save the report to database
    const { data: savedReport, error: saveError } = await supabase
      .from('progress_reports')
      .insert({
        student_id: studentId,
        teacher_id: user.id,
        class_id: classId || null,
        report_content: reportContent,
        start_date: startDate,
        end_date: endDate
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving report:', saveError);
      return new Response(
        JSON.stringify({ error: 'Failed to save report' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        report: savedReport,
        reportContent: reportContent 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error in generate-progress-report function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});