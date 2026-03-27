import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ResearchPaper } from '@/components/research/researchPaperTypes';

interface GeneratePaperParams {
  topic: string;
  contentSummary?: string;
  insights?: string[];
  tags?: string[];
  conflicts?: string;
}

export function useResearchPaperGenerator() {
  const [paper, setPaper] = useState<ResearchPaper | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const generate = useCallback(async (params: GeneratePaperParams) => {
    setIsGenerating(true);
    setIsOpen(true);
    setPaper(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-research-paper', {
        body: params,
      });

      if (error) {
        toast.error('Failed to generate research paper');
        console.error(error);
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setPaper(data.data);
      toast.success('Research paper generated!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate research paper');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const updatePaper = useCallback((updated: ResearchPaper) => {
    setPaper(updated);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  return { paper, isGenerating, isOpen, generate, updatePaper, close };
}
