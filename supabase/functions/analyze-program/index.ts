import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { fileBase64, fileType, mimeType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a lesson program analyzer for an educational app. You receive images or PDF pages of a teacher's lesson program/curriculum.

Your task is to extract structured data from the document. Extract:
- Lesson numbers (in order)
- Lesson titles  
- Unit/module names

Return the data using the provided tool function. If you cannot extract meaningful data, return an empty array.
Always maintain the original language of the document (Arabic, French, etc).`;

    const userContent: any[] = [
      {
        type: "text",
        text: "Analyze this lesson program document and extract all lessons with their numbers, titles, and units/modules. Extract every lesson you can find."
      }
    ];

    // For images, send as image_url
    if (mimeType && (mimeType.startsWith("image/") || fileType === "image")) {
      userContent.push({
        type: "image_url",
        image_url: {
          url: `data:${mimeType};base64,${fileBase64}`
        }
      });
    } else {
      // For PDF, send the base64 as text context
      userContent.push({
        type: "text", 
        text: `[Document content in base64 - type: ${mimeType || fileType}]: ${fileBase64.substring(0, 50000)}`
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_lessons",
              description: "Extract structured lesson data from a curriculum document",
              parameters: {
                type: "object",
                properties: {
                  lessons: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        lesson_number: { type: "integer", description: "Sequential lesson number" },
                        lesson_title: { type: "string", description: "Title of the lesson" },
                        unit: { type: "string", description: "Unit or module name this lesson belongs to" }
                      },
                      required: ["lesson_number", "lesson_title"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["lessons"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_lessons" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    
    // Extract the tool call result
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    let lessons = [];
    
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        lessons = parsed.lessons || [];
      } catch {
        console.error("Failed to parse tool call arguments");
      }
    }

    return new Response(JSON.stringify({ lessons }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-program error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
