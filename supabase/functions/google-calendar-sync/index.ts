import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // 1. Initialize Supabase Admin Client to securely fetch internal tokens
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Validate the user making the request
    const authHeader = req.headers.get('Authorization')!
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (userError || !user) throw new Error('Unauthorized user session.')

    // 3. Extract the meeting/deal event details sent from your frontend app
    const { summary, description, startDateTime, endDateTime } = await req.json()

    // 4. Query the Supabase internal identities table to grab the user's Google Access Token
    const { data: identities, error: identError } = await supabaseAdmin
      .from('identities')
      .select('identity_data')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .single()

    if (identError || !identities) throw new Error('User has not linked their Google account yet.')
    
    // Extract token from Supabase Auth provider data metadata wrapper
    const googleAccessToken = identities.identity_data.access_token

    console.log(`Pushing fresh event to Google Calendar for user: ${user.id}`)

    // 5. Fire the structural event payload straight to the official Google Calendar API endpoints
    const googleResponse = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${googleAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: summary,
          description: description,
          start: { dateTime: startDateTime, timeZone: 'UTC' },
          end: { dateTime: endDateTime, timeZone: 'UTC' },
        }),
      }
    )

    const googleData = await googleResponse.json()
    if (!googleResponse.ok) throw new Error(`Google API rejection: ${googleData.error.message}`)

    return new Response(
      JSON.stringify({ success: true, eventId: googleData.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    console.error(`Sync Engine Crash: ${error.message}`)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})