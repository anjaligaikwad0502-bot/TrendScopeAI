import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Scale, CheckCircle2, XCircle, RefreshCw, Trophy,
  Brain, Rocket, ChevronDown, ChevronUp, Loader2, AlertTriangle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { AutoConflictResult } from '@/hooks/useAutoConflictAnalysis';

interface AutoConflictOverlayProps {
  result: AutoConflictResult | null;
  loading: boolean;
  error: string | null;
}

const severityColor: Record<string, string> = {
  high: 'text-destructive',
  medium: 'text-amber-500',
  low: 'text-muted-foreground',
};

export function AutoConflictOverlay({ result, loading, error }: AutoConflictOverlayProps) {
  const [expanded, setExpanded] = useState(false);

  if (!loading && !result && !error) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="glass rounded-2xl border border-border/50 overflow-hidden mb-6"
    >
      {/* Header - always visible */}
      <button
        onClick={() => !loading && setExpanded(prev => !prev)}
        className="w-full flex items-center justify-between p-4 hover:bg-secondary/20 transition-colors"
        disabled={loading}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            {loading ? (
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            ) : (
              <Scale className="w-5 h-5 text-primary" />
            )}
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              ⚖️ Conflict Analysis Agent
              {loading && (
                <span className="text-xs font-normal text-muted-foreground animate-pulse">
                  Analyzing...
                </span>
              )}
              {result && !loading && (
                <Badge variant="secondary" className="text-[10px]">
                  {result.similar_papers.length} related papers
                </Badge>
              )}
            </h3>
            {result && !loading && !expanded && (
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 max-w-lg">
                {result.key_takeaway}
              </p>
            )}
          </div>
        </div>
        {!loading && result && (
          expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          )
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="px-4 pb-4">
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        </div>
      )}

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && result && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              {/* Similar Papers Found */}
              <Section icon={Search} title="Similar Papers Found" emoji="🔍">
                <div className="space-y-2">
                  {result.similar_papers.map((p, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-secondary/20 space-y-1">
                      <p className="text-sm font-medium">{p.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.authors} • {p.year}
                      </p>
                      <p className="text-xs text-muted-foreground/80 italic">{p.relevance}</p>
                    </div>
                  ))}
                </div>
              </Section>

              {/* Conflict Summary */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  ⚖️ Conflict Summary
                </h4>

                {/* Agreements */}
                {result.agreements.length > 0 && (
                  <Section icon={CheckCircle2} title="Agreements" emoji="✅" iconClass="text-emerald-500">
                    <div className="space-y-2">
                      {result.agreements.map((a, i) => (
                        <div key={i} className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                          <p className="text-sm">{a.description}</p>
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {a.papers.map((p, j) => (
                              <Badge key={j} variant="outline" className="text-[10px]">{p}</Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Contradictions */}
                {result.contradictions.length > 0 && (
                  <Section icon={XCircle} title="Contradictions" emoji="❌" iconClass="text-destructive">
                    <div className="space-y-2">
                      {result.contradictions.map((c, i) => (
                        <div key={i} className="p-2.5 rounded-lg bg-destructive/5 border border-destructive/10">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className={cn('w-3.5 h-3.5 mt-0.5 shrink-0', severityColor[c.severity])} />
                            <div>
                              <p className="text-sm">{c.description}</p>
                              <div className="flex gap-1 mt-1.5 flex-wrap">
                                {c.papers.map((p, j) => (
                                  <Badge key={j} variant="outline" className="text-[10px]">{p}</Badge>
                                ))}
                                <Badge variant="outline" className="text-[10px] ml-1">{c.severity}</Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Partial Overlaps */}
                {result.partial_overlaps.length > 0 && (
                  <Section icon={RefreshCw} title="Partial Overlaps" emoji="🔄" iconClass="text-amber-500">
                    <div className="space-y-2">
                      {result.partial_overlaps.map((o, i) => (
                        <div key={i} className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10">
                          <p className="text-sm">{o.description}</p>
                          <div className="flex gap-3 mt-1.5 text-xs text-muted-foreground">
                            <span>✅ Agrees: {o.agrees_on}</span>
                          </div>
                          <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground">
                            <span>❌ Differs: {o.differs_on}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}
              </div>

              {/* Best Supported Insight */}
              {result.best_supported_insight && (
                <Section icon={Trophy} title="Best-Supported Insight" emoji="🏆" iconClass="text-amber-500">
                  <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10 space-y-1.5">
                    <p className="text-sm font-medium">{result.best_supported_insight.claim}</p>
                    <p className="text-xs text-muted-foreground">{result.best_supported_insight.why_strongest}</p>
                    <p className="text-xs text-muted-foreground/80 italic">
                      Evidence: {result.best_supported_insight.supporting_evidence}
                    </p>
                  </div>
                </Section>
              )}

              {/* Key Takeaway */}
              <Section icon={Brain} title="Key Takeaway" emoji="🧠">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {result.key_takeaway}
                </p>
              </Section>

              {/* Research Opportunity */}
              {result.research_opportunity && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-3 rounded-xl bg-primary/10 border border-primary/20"
                >
                  <div className="flex items-start gap-2">
                    <Rocket className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-semibold text-primary">🚀 Research Opportunity</h4>
                      <p className="text-sm text-muted-foreground mt-1">{result.research_opportunity}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Section({ icon: Icon, title, emoji, iconClass, children }: {
  icon: typeof Search;
  title: string;
  emoji: string;
  iconClass?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className={cn('w-3.5 h-3.5', iconClass || 'text-primary')} />
        <h4 className="text-xs font-semibold">{emoji} {title}</h4>
      </div>
      {children}
    </div>
  );
}
