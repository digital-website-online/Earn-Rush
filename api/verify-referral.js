import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { ref, visitor, userId } = req.body;

  if (!ref || !visitor || !userId) {
    return res.status(400).json({
      error: 'Missing ref, visitor or userId'
    });
  }

  const { data, error } = await supabase
    .from('referral_clicks')
    .update({
      referred_user_id: userId,
      verified_at: new Date().toISOString()
    })
    .eq('ref_code', ref)
    .eq('visitor_id', visitor)
    .is('referred_user_id', null)
    .is('verified_at', null)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error(
      '[Referral] Verification failed:',
      error.message
    );

    return res.status(500).json({
      error: error.message
    });
  }

  if (!data) {
    return res.status(404).json({
      error: 'Matching referral click not found'
    });
  }

  return res.status(200).json({
    success: true,
    referralId: data.id
  });
}