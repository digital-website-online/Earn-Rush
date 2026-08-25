import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { ref } = req.query;

  if (!ref) {
    return res.status(400).json({ error: 'Missing ref' });
  }

  const { count, error } = await supabase
    .from('referral_clicks')
    .select('*', {
      count: 'exact',
      head: true
    })
    .eq('ref_code', ref)
    .not('referred_user_id', 'is', null)
    .not('verified_at', 'is', null);

  if (error) {
    console.error('[Referral] Count failed:', error.message);

    return res.status(500).json({
      error: error.message
    });
  }

  return res.status(200).json({
    count: count || 0
  });
}