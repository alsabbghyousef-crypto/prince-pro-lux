import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  FileText,
  FileSpreadsheet,
  Download,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Search,
  AlertCircle,
  Loader2,
  FileCode,
  Copy,
  Check,
  RotateCw
} from 'lucide-react';
import type { DataSheet } from '../../types/datasheet';

interface UniversalFileViewerProps {
  file: DataSheet;
  onDownload: () => void;
}

// Helper to construct full file URL
export function getFileFullUrl(file: DataSheet): string {
  if (!file) return '';
  const apiBase = (import.meta.env.VITE_API_URL || '/backend/api').replace(/\/+$/, '');
  if (file.id) {
    return `${apiBase}/datasheets/${file.id}/preview`;
  }
  return file.file_path || '';
}

export default function UniversalFileViewer({ file, onDownload }: UniversalFileViewerProps) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Excel state
  const [excelSheets, setExcelSheets] = useState<{ name: string; data: any[][] }[]>([]);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [excelSearch, setExcelSearch] = useState('');
  const [isExcelLoading, setIsExcelLoading] = useState(false);
  const [excelError, setExcelError] = useState('');

  // Text state
  const [textContent, setTextContent] = useState('');
  const [isTextLoading, setIsTextLoading] = useState(false);

  const fileUrl = getFileFullUrl(file);
  const extension = (file.file_extension || '').toLowerCase();
  const fileType = file.file_type;

  // 1. Handle Excel Files (.xlsx, .xls, .csv)
  useEffect(() => {
    if (fileType === 'excel' || ['xlsx', 'xls', 'csv'].includes(extension)) {
      setIsExcelLoading(true);
      setExcelError('');

      fetch(fileUrl)
        .then((res) => {
          if (!res.ok) throw new Error('فشل جلب ملف الإكسل');
          return res.arrayBuffer();
        })
        .then((buffer) => {
          const workbook = XLSX.read(buffer, { type: 'array' });
          const sheets = workbook.SheetNames.map((name) => {
            const worksheet = workbook.Sheets[name];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
            return { name, data: jsonData };
          });
          setExcelSheets(sheets);
          setActiveSheetIndex(0);
          setIsExcelLoading(false);
        })
        .catch((err) => {
          console.error('Excel parse error:', err);
          setExcelError('تعذر عرض محتوى ملف الإكسل داخل المتصفح. يمكنك تحميل الملف لفتحه على جهازك.');
          setIsExcelLoading(false);
        });
    }
  }, [fileUrl, fileType, extension]);

  // 2. Handle Text Files (.txt, .json, .xml, .md)
  useEffect(() => {
    if (fileType === 'text' || ['txt', 'json', 'xml', 'md', 'log'].includes(extension)) {
      setIsTextLoading(true);
      fetch(fileUrl)
        .then((res) => res.text())
        .then((text) => {
          setTextContent(text);
          setIsTextLoading(false);
        })
        .catch(() => {
          setIsTextLoading(false);
        });
    }
  }, [fileUrl, fileType, extension]);

  const handleCopyText = () => {
    navigator.clipboard.writeText(textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filtered Excel data based on search
  const currentSheet = excelSheets[activeSheetIndex];
  const filteredExcelData = React.useMemo(() => {
    if (!currentSheet || !currentSheet.data) return [];
    if (!excelSearch.trim()) return currentSheet.data;
    const term = excelSearch.toLowerCase().trim();
    return currentSheet.data.filter((row) =>
      row.some((cell) => String(cell || '').toLowerCase().includes(term))
    );
  }, [currentSheet, excelSearch]);

  // ── Render Case A: PDF Document ──
  if (fileType === 'pdf' || extension === 'pdf') {
    return (
      <div className={`flex flex-col h-full w-full ${isFullscreen ? 'fixed inset-0 z-[10000] bg-background p-4' : ''}`}>
        
        {/* PDF Floating Controls */}
        <div className="flex items-center justify-between gap-2 p-2.5 bg-secondary/60 border border-border/80 rounded-xl mb-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-rose-500" />
              <span>مستند PDF ({file.original_name})</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Open in Dedicated Browser Tab */}
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-background hover:bg-secondary text-foreground text-xs font-bold border border-border flex items-center gap-1.5 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5 text-primary" />
              <span>فتح في نافذة كاملة</span>
            </a>

            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-lg bg-background hover:bg-secondary text-foreground border border-border"
              title={isFullscreen ? 'تصغير' : 'ملء الشاشة'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Embedded PDF Viewer with fallback */}
        <div className="flex-1 w-full min-h-[550px] bg-secondary/30 rounded-2xl overflow-hidden border border-border relative">
          <object
            data={`${fileUrl}#toolbar=1&navpanes=1&scrollbar=1`}
            type="application/pdf"
            className="w-full h-full min-h-[550px] rounded-2xl"
          >
            {/* Fallback iframe */}
            <iframe
              src={`${fileUrl}#toolbar=1`}
              className="w-full h-full min-h-[550px] border-none"
              title={file.title}
            >
              <div className="p-8 text-center space-y-4">
                <p className="text-sm font-bold text-muted-foreground">
                  متصفحك لا يدعم عرض ملفات PDF المدمجة مباشرة.
                </p>
                <button
                  onClick={onDownload}
                  className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md"
                >
                  تحميل المستند الآن
                </button>
              </div>
            </iframe>
          </object>
        </div>
      </div>
    );
  }

  // ── Render Case B: Excel Spreadsheet (.xlsx, .xls, .csv) ──
  if (fileType === 'excel' || ['xlsx', 'xls', 'csv'].includes(extension)) {
    return (
      <div className={`flex flex-col h-full w-full ${isFullscreen ? 'fixed inset-0 z-[10000] bg-background p-4' : ''}`}>
        
        {/* Excel Header & Sheet Tabs */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-secondary/60 border border-border/80 rounded-2xl mb-3 shrink-0">
          
          {/* Sheets Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 shrink-0 ml-1">
              <FileSpreadsheet className="w-4 h-4" />
              <span>الأوراق:</span>
            </span>

            {excelSheets.map((sheet, idx) => (
              <button
                key={idx}
                onClick={() => setActiveSheetIndex(idx)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  activeSheetIndex === idx
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-background hover:bg-secondary text-muted-foreground hover:text-foreground border border-border'
                }`}
              >
                {sheet.name}
              </button>
            ))}
          </div>

          {/* Search inside Excel & Actions */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="بحث داخل الجدول..."
                value={excelSearch}
                onChange={(e) => setExcelSearch(e.target.value)}
                className="pl-3 pr-8 py-1.5 bg-background border border-border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium w-36 sm:w-48"
              />
            </div>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-xl bg-background hover:bg-secondary border border-border"
              title={isFullscreen ? 'تصغير' : 'ملء الشاشة'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Excel Table Content */}
        <div className="flex-1 w-full min-h-[480px] bg-card border border-border/80 rounded-2xl overflow-auto shadow-inner relative">
          {isExcelLoading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
              <p className="text-xs font-bold text-muted-foreground">جاري قراءة وتحليل بيانات الإكسل...</p>
            </div>
          ) : excelError ? (
            <div className="p-8 text-center space-y-3 my-auto">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
              <p className="text-xs font-bold text-muted-foreground">{excelError}</p>
              <button
                onClick={onDownload}
                className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
              >
                تحميل الملف وفتحه على الجهاز
              </button>
            </div>
          ) : filteredExcelData.length === 0 ? (
            <div className="p-8 text-center text-xs font-bold text-muted-foreground">
              لا توجد بيانات في هذه الورقة
            </div>
          ) : (
            <table className="w-full text-right text-xs border-collapse font-sans">
              <tbody>
                {filteredExcelData.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className={rIdx === 0 ? 'bg-secondary/70 font-bold sticky top-0 z-10 border-b border-border' : 'hover:bg-secondary/30 border-b border-border/40'}
                  >
                    {/* Row Number */}
                    <td className="p-2 text-center text-[10px] text-muted-foreground font-mono bg-secondary/40 border-l border-border w-10 select-none">
                      {rIdx + 1}
                    </td>

                    {/* Cells */}
                    {row.map((cell: any, cIdx: number) => (
                      <td
                        key={cIdx}
                        className="p-2.5 border-l border-border/30 whitespace-nowrap font-medium text-foreground max-w-xs truncate"
                        title={String(cell ?? '')}
                      >
                        {String(cell ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  // ── Render Case C: Image (.png, .jpg, .jpeg, .webp, .svg, .gif) ──
  if (fileType === 'image' || ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'].includes(extension)) {
    return (
      <div className={`flex flex-col h-full w-full ${isFullscreen ? 'fixed inset-0 z-[10000] bg-background p-4' : ''}`}>
        
        {/* Image Controls */}
        <div className="flex items-center justify-between p-2.5 bg-secondary/60 border border-border rounded-xl mb-3 shrink-0">
          <span className="text-xs font-bold text-foreground">
            معاينة الصورة ({file.original_name})
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setZoom((z) => Math.max(30, z - 20))}
              className="p-1.5 rounded-lg bg-background hover:bg-secondary border border-border"
              title="تصغير"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold px-2">{zoom}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(300, z + 20))}
              className="p-1.5 rounded-lg bg-background hover:bg-secondary border border-border"
              title="تكبير"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="p-1.5 rounded-lg bg-background hover:bg-secondary border border-border"
              title="تدوير"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-lg bg-background hover:bg-secondary border border-border"
              title={isFullscreen ? 'تصغير' : 'ملء الشاشة'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Image Display */}
        <div className="flex-1 min-h-[480px] bg-secondary/30 rounded-2xl overflow-auto flex items-center justify-center p-4 border border-border">
          <img
            src={fileUrl}
            alt={file.title}
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              transition: 'transform 0.15s ease-out',
            }}
            className="max-h-[580px] max-w-full object-contain rounded-xl shadow-lg"
          />
        </div>
      </div>
    );
  }

  // ── Render Case D: Text / Code / JSON (.txt, .json, .xml, .md) ──
  if (fileType === 'text' || ['txt', 'json', 'xml', 'md', 'log'].includes(extension)) {
    return (
      <div className="flex flex-col h-full w-full">
        <div className="flex items-center justify-between p-2.5 bg-secondary/60 border border-border rounded-xl mb-3 shrink-0">
          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <FileCode className="w-4 h-4 text-teal-500" />
            <span>عرض النص ({file.original_name})</span>
          </span>

          <button
            onClick={handleCopyText}
            className="px-3 py-1.5 rounded-lg bg-background hover:bg-secondary border border-border text-xs font-bold flex items-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'تم النسخ!' : 'نسخ المحتوى'}</span>
          </button>
        </div>

        <div className="flex-1 min-h-[450px] bg-card border border-border rounded-2xl p-4 overflow-auto font-mono text-xs leading-relaxed" dir="ltr">
          {isTextLoading ? (
            <div className="py-20 flex justify-center items-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <pre className="whitespace-pre-wrap">{textContent}</pre>
          )}
        </div>
      </div>
    );
  }

  // ── Render Case E: Word / Other (.docx, .doc, archives, binaries) ──
  return (
    <div className="text-center p-8 sm:p-12 space-y-4 max-w-lg mx-auto">
      <div className="w-20 h-20 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-inner">
        <FileSpreadsheet className="w-10 h-10" />
      </div>

      <div className="space-y-1.5">
        <h4 className="text-base sm:text-lg font-black text-foreground">
          {file.title}
        </h4>
        <p className="text-xs text-muted-foreground font-mono" dir="ltr">
          {file.original_name} • {extension.toUpperCase()}
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed pt-2">
          هذا الملف بصيغة ({extension.toUpperCase()}). يمكنك تنزيله مباشرة على جهازك وعرضه وتعديله عبر برامج الأوفيس والتطبيقات المخصصة له.
        </p>
      </div>

      <div className="pt-4">
        <button
          onClick={onDownload}
          className="px-6 py-3 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm font-bold shadow-lg shadow-primary/25 inline-flex items-center gap-2 transition-all active:scale-[0.98]"
        >
          <Download className="w-4 h-4" />
          <span>تحميل الملف الآن</span>
        </button>
      </div>
    </div>
  );
}
