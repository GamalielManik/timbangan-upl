import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.4";

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Initialize Web Push
webpush.setVapidDetails(
  'mailto:admin@timbangan-upl.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

// Initialize Supabase Client with Service Role Key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  try {
    const payload = await req.json();
    
    // Trigger only on INSERT to weighing_sessions
    if (payload.type === 'INSERT' && payload.table === 'weighing_sessions') {
      const { owner_name, start_time, end_time } = payload.record;
      
      // Calculate duration
      let durasi = "Tidak diketahui";
      if (start_time && end_time) {
        const diff = new Date(end_time).getTime() - new Date(start_time).getTime();
        durasi = `${Math.floor(diff / 60000)} menit ${Math.floor((diff % 60000) / 1000)} detik`;
      }

      const notificationPayload = JSON.stringify({
        title: "Update Penimbangan",
        body: `Data tersimpan milik ${owner_name || 'Tidak diketahui'}, durasi ${durasi}`
      });

      // Fetch all subscribers
      const { data: subscriptions, error: fetchError } = await supabase
        .from('push_subscriptions')
        .select('*');
        
      if (fetchError) {
        console.error('Error fetching subscriptions:', fetchError);
        throw fetchError;
      }
      
      if (subscriptions && subscriptions.length > 0) {
        const promises = subscriptions.map(async (sub) => {
          try {
            await webpush.sendNotification(sub.subscription_json, notificationPayload);
          } catch (error: any) {
            console.error('Push notification error:', error);
            // Remove expired or unsubscribed tokens (410 Gone / 404 Not Found)
            if (error.statusCode === 410 || error.statusCode === 404) {
              await supabase
                .from('push_subscriptions')
                .delete()
                .eq('endpoint', sub.endpoint);
            }
          }
        });
        
        await Promise.all(promises);
      }
    }
    
    return new Response(JSON.stringify({ success: true }), { 
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });
  } catch (err: any) {
    console.error('Webhook error:', err);
    return new Response(JSON.stringify({ error: err.message }), { 
      headers: { 'Content-Type': 'application/json' },
      status: 500 
    });
  }
});
