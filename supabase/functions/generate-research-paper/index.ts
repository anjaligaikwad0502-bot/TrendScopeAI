import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { topic, contentSummary, insights, tags, conflicts } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an academic research paper generator. Generate a well-structured, comprehensive research paper based on the given topic and context. 

Output a JSON object with these exact fields:
- title: string (academic paper title)
- abstract: string (200-300 words)
- introduction: string (400-600 words with context and motivation)
- literatureReview: string (400-600 words reviewing existing work)
- methodology: string (300-500 words describing research approach)
- resultsAndDiscussion: string (500-700 words analyzing trends, findings, and any conflicts)
- conclusion: string (200-300 words summarizing key findings)
- futureScope: string (200-300 words on future research directions)
- references: string[] (8-15 realistic academic references in APA format)

Write in formal academic tone. Include specific details, statistics where relevant, and proper academic structure. Each section should flow logically into the next.`;

    const userPrompt = `Generate a research paper on the topic: "${topic}"

${contentSummary ? `Context/Summary:\n${contentSummary}\n` : ''}
${insights?.length ? `Key Insights:\n${insights.map((i: string) => `- ${i}`).join('\n')}\n` : ''}
${tags?.length ? `Related Topics: ${tags.join(', ')}\n` : ''}
${conflicts ? `Known Conflicts/Debates:\n${conflicts}\n` : ''}

Generate a complete, well-structured academic research paper.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_paper",
              description: "Generate a structured academic research paper",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  abstract: { type: "string" },
                  introduction: { type: "string" },
                  literatureReview: { type: "string" },
                  methodology: { type: "string" },
                  resultsAndDiscussion: { type: "string" },
                  conclusion: { type: "string" },
                  futureScope: { type: "string" },
                  references: { type: "array", items: { type: "string" } },
                },
                required: ["title", "abstract", "introduction", "literatureReview", "methodology", "resultsAndDiscussion", "conclusion", "futureScope", "references"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_paper" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "No paper generated" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paper = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ success: true, data: paper }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-research-paper error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
