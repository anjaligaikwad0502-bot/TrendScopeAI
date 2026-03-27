const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, summary, tags, author, source, published_at } = await req.json();

    if (!title || !summary) {
      return new Response(
        JSON.stringify({ error: 'Title and summary are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are an autonomous Conflict Analysis Agent. Given a research paper or article, you must:
1. Discover 2-5 similar/related research papers from your knowledge
2. Perform comparative conflict analysis
3. Identify the best-supported insight
4. Detect research opportunities

Respond ONLY with valid JSON (no markdown, no code fences) matching this exact schema:
{
  "similar_papers": [
    { "title": "string", "authors": "string", "year": "string", "relevance": "string (1 sentence why relevant)" }
  ],
  "agreements": [
    { "description": "string", "papers": ["paper title 1", "paper title 2"] }
  ],
  "contradictions": [
    { "description": "string", "papers": ["paper title 1", "paper title 2"], "severity": "high|medium|low" }
  ],
  "partial_overlaps": [
    { "description": "string", "agrees_on": "string", "differs_on": "string" }
  ],
  "best_supported_insight": {
    "claim": "string",
    "why_strongest": "string (2 sentences max)",
    "supporting_evidence": "string"
  },
  "key_takeaway": "string (2-3 concise lines)",
  "research_opportunity": "string or null (bold insight about under-explored area, null if none detected)"
}

Rules:
- Find 2-5 real, plausible related works
- Be concise and insightful, not verbose
- Focus on meaning and impact, not raw data
- If you detect a research gap, always highlight it as research_opportunity
- Evaluate reliability based on methodology quality, recency, evidence strength`;

    const userPrompt = `Analyze this content and find conflicts with related research:

Title: ${title}
Author: ${author || 'Unknown'}
Source: ${source || 'Unknown'}
Published: ${published_at || 'Unknown'}
Tags: ${(tags || []).join(', ')}

Summary/Abstract:
${summary}

Find similar papers, identify agreements, contradictions, and partial overlaps. Determine the best-supported insight and detect any research opportunities.`;

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
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again shortly.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errText = await response.text();
      console.error('AI gateway error:', status, errText);
      return new Response(
        JSON.stringify({ error: 'AI analysis failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await response.json();
    const rawContent = aiData.choices?.[0]?.message?.content || '';

    let analysis;
    try {
      const jsonStr = rawContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      analysis = JSON.parse(jsonStr);
    } catch {
      console.error('Failed to parse AI response:', rawContent.slice(0, 500));
      return new Response(
        JSON.stringify({ error: 'Failed to parse analysis results' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ensure defaults
    analysis.similar_papers = analysis.similar_papers || [];
    analysis.agreements = analysis.agreements || [];
    analysis.contradictions = analysis.contradictions || [];
    analysis.partial_overlaps = analysis.partial_overlaps || [];
    analysis.best_supported_insight = analysis.best_supported_insight || null;
    analysis.key_takeaway = analysis.key_takeaway || '';
    analysis.research_opportunity = analysis.research_opportunity || null;

    return new Response(
      JSON.stringify({ success: true, data: analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Auto conflict analysis error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
