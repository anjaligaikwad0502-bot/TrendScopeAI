import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ContentItem } from '@/lib/api/content';

export interface AutoConflictResult {
  similar_papers: { title: string; authors: string; year: string; relevance: string }[];
  agreements: { description: string; papers: string[] }[];
  contradictions: { description: string; papers: string[]; severity: string }[];
  partial_overlaps: { description: string; agrees_on: string; differs_on: string }[];
  best_supported_insight: { claim: string; why_strongest: string; supporting_evidence: string } | null;
  key_takeaway: string;
  research_opportunity: string | null;
}

export function useAutoConflictAnalysis(item: ContentItem | null) {
  const [result, setResult] = useState<AutoConflictResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const analyzedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!item || analyzedRef.current === item.id) return;
    // Only auto-analyze papers and articles
    if (item.content_type !== 'paper' && item.content_type !== 'article') return;

    analyzedRef.current = item.id;
    setLoading(true);
    setError(null);
    setResult(null);

    (async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke('auto-conflict-analysis', {
          body: {
            title: item.title,
            summary: item.summary,
            tags: item.tags,
            author: item.author,
            source: item.source,
            published_at: item.published_at,
          },
        });

        if (fnError) {
          setError(fnError.message || 'Analysis failed');
          return;
        }
        if (data?.error) {
          setError(data.error);
          return;
        }
        setResult(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unexpected error');
      } finally {
        setLoading(false);
      }
    })();
  }, [item]);

  return { result, loading, error };
}
