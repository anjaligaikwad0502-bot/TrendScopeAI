import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Download, FileText, Loader2, Edit3, Eye, FileDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ResearchPaper } from './researchPaperTypes';

interface ResearchPaperGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  paper: ResearchPaper | null;
  isGenerating: boolean;
  onUpdate: (paper: ResearchPaper) => void;
}

const SECTIONS: { key: keyof Omit<ResearchPaper, 'references' | 'title'>; label: string }[] = [
  { key: 'abstract', label: 'Abstract' },
  { key: 'introduction', label: 'Introduction' },
  { key: 'literatureReview', label: 'Literature Review' },
  { key: 'methodology', label: 'Methodology' },
  { key: 'resultsAndDiscussion', label: 'Results & Discussion' },
  { key: 'conclusion', label: 'Conclusion' },
  { key: 'futureScope', label: 'Future Scope' },
];

export function ResearchPaperGenerator({
  isOpen, onClose, paper, isGenerating, onUpdate
}: ResearchPaperGeneratorProps) {
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [editPaper, setEditPaper] = useState<ResearchPaper | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const startEdit = () => {
    if (paper) {
      setEditPaper({ ...paper, references: [...paper.references] });
      setMode('edit');
    }
  };

  const saveEdit = () => {
    if (editPaper) {
      onUpdate(editPaper);
      setMode('view');
    }
  };

  const updateField = (key: keyof ResearchPaper, value: string | string[]) => {
    if (editPaper) {
      setEditPaper({ ...editPaper, [key]: value });
    }
  };

  const currentPaper = mode === 'edit' ? editPaper : paper;

  const downloadPDF = async () => {
    if (!currentPaper) return;
    setIsDownloading(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      const margin = 20;
      let y = margin;
      const pageWidth = doc.internal.pageSize.width;
      const maxWidth = pageWidth - margin * 2;

      const addText = (text: string, fontSize: number, bold = false, color: [number, number, number] = [0, 0, 0]) => {
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setTextColor(...color);
        const lines = doc.splitTextToSize(text, maxWidth);
        for (const line of lines) {
          if (y > 275) { doc.addPage(); y = margin; }
          doc.text(line, margin, y);
          y += fontSize * 0.45;
        }
        y += 3;
      };

      const addSection = (title: string) => {
        y += 6;
        if (y > 260) { doc.addPage(); y = margin; }
        addText(title, 14, true, [0, 100, 120]);
        doc.setDrawColor(0, 100, 120);
        doc.line(margin, y, pageWidth - margin, y);
        y += 6;
      };

      // Title page
      y = 80;
      addText(currentPaper.title, 20, true, [0, 60, 80]);
      y += 10;
      addText(`Generated: ${new Date().toLocaleDateString()}`, 10, false, [120, 120, 120]);
      doc.addPage();
      y = margin;

      // Abstract
      addSection('Abstract');
      addText(currentPaper.abstract, 10);

      // Main sections
      addSection('1. Introduction');
      addText(currentPaper.introduction, 10);

      addSection('2. Literature Review');
      addText(currentPaper.literatureReview, 10);

      addSection('3. Methodology');
      addText(currentPaper.methodology, 10);

      addSection('4. Results & Discussion');
      addText(currentPaper.resultsAndDiscussion, 10);

      addSection('5. Conclusion');
      addText(currentPaper.conclusion, 10);

      addSection('6. Future Scope');
      addText(currentPaper.futureScope, 10);

      // References
      addSection('References');
      currentPaper.references.forEach((ref, i) => {
        addText(`[${i + 1}] ${ref}`, 9, false, [60, 60, 60]);
      });

      const filename = `Research_Paper_${currentPaper.title.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const downloadDOCX = () => {
    if (!currentPaper) return;
    // Generate a simple HTML-based DOCX (using Blob with HTML content that Word can open)
    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"><title>${currentPaper.title}</title>
      <style>
        body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; margin: 1in; }
        h1 { font-size: 18pt; color: #1a1a1a; text-align: center; margin-bottom: 24pt; }
        h2 { font-size: 14pt; color: #006478; border-bottom: 1px solid #006478; padding-bottom: 4pt; margin-top: 18pt; }
        p { text-align: justify; margin-bottom: 8pt; }
        .ref { font-size: 10pt; color: #444; margin-bottom: 4pt; }
      </style></head>
      <body>
        <h1>${currentPaper.title}</h1>
        <p style="text-align:center;color:#888;font-size:10pt;">Generated: ${new Date().toLocaleDateString()}</p>
        <h2>Abstract</h2><p>${currentPaper.abstract}</p>
        <h2>1. Introduction</h2><p>${currentPaper.introduction}</p>
        <h2>2. Literature Review</h2><p>${currentPaper.literatureReview}</p>
        <h2>3. Methodology</h2><p>${currentPaper.methodology}</p>
        <h2>4. Results & Discussion</h2><p>${currentPaper.resultsAndDiscussion}</p>
        <h2>5. Conclusion</h2><p>${currentPaper.conclusion}</p>
        <h2>6. Future Scope</h2><p>${currentPaper.futureScope}</p>
        <h2>References</h2>
        ${currentPaper.references.map((ref, i) => `<p class="ref">[${i + 1}] ${ref}</p>`).join('')}
      </body></html>
    `;

    const blob = new Blob([html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Research_Paper_${currentPaper.title.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-4xl max-h-[90vh] glass-strong rounded-2xl flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Research Paper Generator</h2>
                <p className="text-xs text-muted-foreground">
                  {isGenerating ? 'Generating your paper...' : currentPaper ? 'Paper ready — edit or download' : 'Waiting...'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {currentPaper && !isGenerating && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={mode === 'edit' ? saveEdit : startEdit}
                    className="gap-1"
                  >
                    {mode === 'edit' ? <><Eye className="w-4 h-4" /> Preview</> : <><Edit3 className="w-4 h-4" /> Edit</>}
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadPDF} disabled={isDownloading} className="gap-1">
                    <Download className="w-4 h-4" />
                    PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadDOCX} className="gap-1">
                    <FileDown className="w-4 h-4" />
                    DOCX
                  </Button>
                </>
              )}
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1 p-6">
            {isGenerating && (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-muted-foreground">Generating your research paper with AI...</p>
                <p className="text-xs text-muted-foreground">This may take 15-30 seconds</p>
              </div>
            )}

            {!isGenerating && !currentPaper && (
              <div className="text-center py-20 text-muted-foreground">
                No paper generated yet.
              </div>
            )}

            {!isGenerating && currentPaper && (
              <Tabs defaultValue="full" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="full">Full Paper</TabsTrigger>
                  <TabsTrigger value="sections">By Section</TabsTrigger>
                </TabsList>

                <TabsContent value="full" className="space-y-6">
                  {/* Title */}
                  {mode === 'edit' ? (
                    <Input
                      value={currentPaper.title}
                      onChange={(e) => updateField('title', e.target.value)}
                      className="text-2xl font-bold border-primary/30"
                    />
                  ) : (
                    <h1 className="text-2xl font-bold gradient-text">{currentPaper.title}</h1>
                  )}

                  {SECTIONS.map(({ key, label }) => (
                    <div key={key} className="space-y-2">
                      <h2 className="text-lg font-semibold text-primary">{label}</h2>
                      {mode === 'edit' ? (
                        <Textarea
                          value={currentPaper[key] as string}
                          onChange={(e) => updateField(key, e.target.value)}
                          className="min-h-[120px] border-border/50"
                        />
                      ) : (
                        <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                          {currentPaper[key] as string}
                        </p>
                      )}
                    </div>
                  ))}

                  {/* References */}
                  <div className="space-y-2">
                    <h2 className="text-lg font-semibold text-primary">References</h2>
                    {mode === 'edit' ? (
                      <Textarea
                        value={currentPaper.references.join('\n')}
                        onChange={(e) => updateField('references', e.target.value.split('\n').filter(Boolean))}
                        className="min-h-[150px] border-border/50 text-sm"
                      />
                    ) : (
                      <ol className="space-y-1 list-decimal list-inside">
                        {currentPaper.references.map((ref, i) => (
                          <li key={i} className="text-sm text-muted-foreground">{ref}</li>
                        ))}
                      </ol>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="sections" className="space-y-4">
                  {SECTIONS.map(({ key, label }) => (
                    <details key={key} className="glass rounded-xl p-4 group">
                      <summary className="font-semibold cursor-pointer text-primary">{label}</summary>
                      <div className="mt-3">
                        {mode === 'edit' ? (
                          <Textarea
                            value={currentPaper[key] as string}
                            onChange={(e) => updateField(key, e.target.value)}
                            className="min-h-[100px]"
                          />
                        ) : (
                          <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                            {currentPaper[key] as string}
                          </p>
                        )}
                      </div>
                    </details>
                  ))}
                </TabsContent>
              </Tabs>
            )}
          </ScrollArea>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
