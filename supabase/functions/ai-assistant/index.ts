import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory = [] } = await req.json();
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `אתה עוזר AI חכם למערכת ניהול עבודות בניה. אתה עוזר לקבלנים לנהל את העבודות שלהם.

כישוריך:
1. create_job_request - יצירת בקשת עבודה חדשה
2. search_available_workers - חיפוש עובדים זמינים
3. get_active_jobs - הצגת בקשות פעילות

כשמשתמש מבקש משהו כמו "אני צריך שופל למחר בשעה 16:00 עם מפעיל", אתה צריך:
1. לזהות את סוג הציוד (backhoe, loader, bobcat, grader, truck_driver, semi_trailer, laborer)
2. לזהות את התאריך והשעה
3. לזהות את סוג השירות (operator_with_equipment, equipment_only, operator_only)
4. ליצור את הבקשה באמצעות הכלי create_job_request

תמיד תענה בעברית בצורה ידידותית ומקצועית.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        tools: [
          {
            type: 'function',
            function: {
              name: 'create_job_request',
              description: 'יוצר בקשת עבודה חדשה במערכת',
              parameters: {
                type: 'object',
                properties: {
                  work_type: {
                    type: 'string',
                    enum: ['backhoe', 'loader', 'bobcat', 'grader', 'truck_driver', 'semi_trailer', 'laborer'],
                    description: 'סוג הציוד או העובד'
                  },
                  service_type: {
                    type: 'string',
                    enum: ['operator_with_equipment', 'equipment_only', 'operator_only'],
                    description: 'סוג השירות'
                  },
                  work_date: {
                    type: 'string',
                    description: 'תאריך העבודה בפורמט YYYY-MM-DD'
                  },
                  location: {
                    type: 'string',
                    description: 'מיקום העבודה'
                  },
                  notes: {
                    type: 'string',
                    description: 'הערות נוספות'
                  },
                  urgency: {
                    type: 'string',
                    enum: ['low', 'medium', 'high', 'urgent'],
                    description: 'רמת דחיפות'
                  }
                },
                required: ['work_type', 'service_type', 'work_date', 'location']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'get_active_jobs',
              description: 'מחזיר את רשימת הבקשות הפעילות של הקבלן',
              parameters: {
                type: 'object',
                properties: {}
              }
            }
          }
        ],
        tool_choice: 'auto',
        stream: true
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        if (!reader) {
          controller.close();
          return;
        }

        let buffer = '';
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);
                  
                  // Handle tool calls
                  if (parsed.choices?.[0]?.delta?.tool_calls) {
                    const toolCall = parsed.choices[0].delta.tool_calls[0];
                    
                    if (toolCall?.function?.name === 'create_job_request') {
                      try {
                        const args = JSON.parse(toolCall.function.arguments || '{}');
                        
                        const { data: jobData, error: jobError } = await supabase
                          .from('job_requests')
                          .insert({
                            contractor_id: user.id,
                            work_type: args.work_type,
                            service_type: args.service_type,
                            work_date: args.work_date,
                            location: args.location,
                            notes: args.notes || null,
                            urgency: args.urgency || 'medium',
                            status: 'open'
                          })
                          .select()
                          .single();

                        if (jobError) throw jobError;

                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                          type: 'tool_result',
                          tool_call_id: toolCall.id,
                          result: {
                            success: true,
                            message: 'בקשת העבודה נוצרה בהצלחה!',
                            job_id: jobData.id
                          }
                        })}\n\n`));
                      } catch (error) {
                        console.error('Error creating job:', error);
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                          type: 'tool_result',
                          tool_call_id: toolCall.id,
                          result: {
                            success: false,
                            message: 'שגיאה ביצירת הבקשה'
                          }
                        })}\n\n`));
                      }
                    } else if (toolCall?.function?.name === 'get_active_jobs') {
                      const { data: jobs } = await supabase
                        .from('job_requests')
                        .select('*')
                        .eq('contractor_id', user.id)
                        .in('status', ['open', 'accepted'])
                        .order('created_at', { ascending: false });

                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                        type: 'tool_result',
                        tool_call_id: toolCall.id,
                        result: {
                          success: true,
                          jobs: jobs || []
                        }
                      })}\n\n`));
                    }
                  }

                  // Forward regular content
                  controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                } catch (e) {
                  console.error('Error parsing SSE:', e);
                }
              }
            }
          }
        } catch (error) {
          console.error('Stream error:', error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});