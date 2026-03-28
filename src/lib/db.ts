/**
 * db.ts — Every database operation in one file.
 * This IS the backend. Supabase RLS + triggers handle auth and business logic.
 */

import { supabase } from './supabase';

// ── Types ──────────────────────────────────────────────────

export type Genre =
  | 'pop' | 'rock' | 'hip_hop' | 'electronic' | 'r_and_b'
  | 'country' | 'jazz' | 'classical' | 'indie' | 'metal'
  | 'folk' | 'latin' | 'reggae' | 'punk' | 'ambient';

export interface Label {
  id: string;
  owner_id: string;
  name: string;
  specialty: Genre | null;
  energy: number;
  royalties: number;
  created_at: string;
}

export interface Band {
  id: string;
  creator_id: string;
  name: string;
  genre: Genre;
  suno_url: string | null;
  cover_url: string | null;
  avg_rating: number;
  review_count: number;
  is_submitted: boolean;
  submitted_at: string | null;
  created_at: string;
  // joined
  labels?: { name: string };
  tracks?: Track[];
}

export interface Track {
  id: string;
  band_id: string;
  title: string;
  track_number: number;
}

export interface Review {
  id: string;
  band_id: string;
  reviewer_id: string;
  rating: number;
  notes: string;
  royalties_earned: number;
  created_at: string;
}

export const GENRES: { value: Genre; label: string }[] = [
  { value: 'pop', label: 'Pop' },
  { value: 'rock', label: 'Rock' },
  { value: 'hip_hop', label: 'Hip Hop' },
  { value: 'electronic', label: 'Electronic' },
  { value: 'r_and_b', label: 'R&B' },
  { value: 'country', label: 'Country' },
  { value: 'jazz', label: 'Jazz' },
  { value: 'classical', label: 'Classical' },
  { value: 'indie', label: 'Indie' },
  { value: 'metal', label: 'Metal' },
  { value: 'folk', label: 'Folk' },
  { value: 'latin', label: 'Latin' },
  { value: 'reggae', label: 'Reggae' },
  { value: 'punk', label: 'Punk' },
  { value: 'ambient', label: 'Ambient' },
];

// ── Auth ───────────────────────────────────────────────────

export async function signInWithMagicLink(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) throw error;
}

export async function signOut() {
  await supabase.auth.signOut();
}

// ── Profile + Label (onboarding) ───────────────────────────

export async function createProfileAndLabel(
  userId: string,
  username: string,
  labelName: string,
  specialty?: Genre,
) {
  // Create profile
  const { error: profileErr } = await supabase
    .from('profiles')
    .insert({ id: userId, username });
  if (profileErr && !profileErr.message.includes('duplicate')) throw profileErr;

  // Create label
  const { data, error: labelErr } = await supabase
    .from('labels')
    .insert({
      owner_id: userId,
      name: labelName,
      specialty: specialty || null,
    })
    .select()
    .single();
  if (labelErr) throw labelErr;
  return data as Label;
}

export async function getMyLabel(): Promise<Label | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('labels')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ── Bands ──────────────────────────────────────────────────

export async function createBand(
  creatorId: string,
  name: string,
  genre: Genre,
  sunoUrl?: string,
  coverUrl?: string,
) {
  const { data, error } = await supabase
    .from('bands')
    .insert({
      creator_id: creatorId,
      name,
      genre,
      suno_url: sunoUrl || null,
      cover_url: coverUrl || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Band;
}

export async function addTrack(bandId: string, title: string, trackNumber: number) {
  const { data, error } = await supabase
    .from('tracks')
    .insert({ band_id: bandId, title, track_number: trackNumber })
    .select()
    .single();
  if (error) throw error;
  return data as Track;
}

export async function submitBand(bandId: string) {
  const { error } = await supabase
    .from('bands')
    .update({
      is_submitted: true,
      submitted_at: new Date().toISOString(),
    })
    .eq('id', bandId);
  if (error) throw error;
}

export async function getMyBands(creatorId: string): Promise<Band[]> {
  const { data, error } = await supabase
    .from('bands')
    .select('*, tracks(*)')
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ── Review Queue ───────────────────────────────────────────

export async function getReviewQueue(labelId: string, limit = 10): Promise<Band[]> {
  const { data, error } = await supabase
    .rpc('get_review_queue', { p_label_id: labelId, p_limit: limit });
  if (error) throw error;
  // Map the flat RPC result into Band shape
  return (data || []).map((row: any) => ({
    ...row,
    labels: row.creator_label_name ? { name: row.creator_label_name } : undefined,
  }));
}

export async function submitReview(
  bandId: string,
  reviewerId: string,
  rating: number,
  notes = '',
) {
  const { data, error } = await supabase
    .from('reviews')
    .insert({
      band_id: bandId,
      reviewer_id: reviewerId,
      rating,
      notes,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Review;
}

// ── Energy Purchase ───────────────────────────────────────

export async function buyEnergy(labelId: string, amount = 1) {
  const { data, error } = await supabase
    .rpc('buy_energy', { p_label_id: labelId, p_amount: amount });
  if (error) throw error;
  return data as { energy: number; royalties: number; cost: number };
}

// ── Leaderboard ────────────────────────────────────────────

export async function getLeaderboard(
  page = 1,
  perPage = 20,
  genre?: Genre,
): Promise<{ bands: Band[]; count: number }> {
  let query = supabase
    .from('bands')
    .select('*, labels(name)', { count: 'exact' })
    .eq('is_submitted', true)
    .order('avg_rating', { ascending: false })
    .order('review_count', { ascending: false });

  if (genre) query = query.eq('genre', genre);

  const from = (page - 1) * perPage;
  query = query.range(from, from + perPage - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { bands: data || [], count: count || 0 };
}
