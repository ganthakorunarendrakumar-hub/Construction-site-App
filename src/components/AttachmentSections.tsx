import React, { useEffect, useRef, useState } from 'react';
import { Download, Eye, FileText, ImagePlus, Trash2, Upload } from 'lucide-react';
import { TransactionAttachment, TransactionAttachments } from '../types';
import { dataService } from '../services/dataService';

interface AttachmentSectionsProps {
  value: TransactionAttachments;
  onChange: (value: TransactionAttachments) => void;
  onUploadFile: (file: File) => Promise<{ url: string; name: string; size: number }>;
  disabled?: boolean;
}

const documentAccept = '.pdf,.jpg,.jpeg,.png';
const imageAccept = '.jpg,.jpeg,.png';

export const emptyTransactionAttachments = (): TransactionAttachments => ({ images: [] });

export const hasTransactionAttachments = (value: TransactionAttachments): boolean =>
  Boolean(value.invoice || value.dc || value.images.length);

export const AttachmentFileLink: React.FC<{
  file: TransactionAttachment;
  label: string;
  compact?: boolean;
  onPreview?: (file: TransactionAttachment, url: string) => void;
}> = ({ file, label, compact = false, onPreview }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setUrl(null);
    setError(null);
    dataService.resolveAttachmentUrl(file.url)
      .then(resolved => active && setUrl(resolved))
      .catch(err => active && setError(err.message || 'Attachment unavailable.'));
    return () => { active = false; };
  }, [file.url]);

  if (error) return <span className="text-[10px] text-red-600" title={error}>Unavailable</span>;
  if (!url) return <span className="text-[10px] text-bp-muted">Loading...</span>;

  const isImage = file.type?.startsWith('image/') || /\.(jpg|jpeg|png)$/i.test(file.name);
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      download={file.name}
      onClick={event => {
        if (isImage && onPreview) {
          event.preventDefault();
          onPreview(file, url);
        }
      }}
      className="inline-flex min-w-0 items-center gap-2 text-[11px] font-semibold text-bp-text hover:text-bp-blue hover:underline"
      title={file.name}
    >
      {isImage
        ? <img src={url} alt={file.name} className={compact ? 'h-12 w-12 shrink-0 rounded-lg border border-bp-border object-cover' : 'h-5 w-5 shrink-0 rounded object-cover'} />
        : <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-bp-cyan-soft text-bp-blue"><FileText className="h-4 w-4" /></span>}
      <span className="min-w-0 truncate">{label}</span>
    </a>
  );
};

export const AttachmentLinks: React.FC<{
  attachments?: TransactionAttachments;
  legacyUrl?: string;
  legacyName?: string;
}> = ({ attachments, legacyUrl, legacyName }) => {
  const files = [
    attachments?.invoice && { ...attachments.invoice, label: 'Invoice' },
    attachments?.dc && { ...attachments.dc, label: 'DC' },
    ...(attachments?.images || []).map((file, index) => ({ ...file, label: `Image ${index + 1}` }))
  ].filter(Boolean) as Array<TransactionAttachment & { label: string }>;
  if (!files.length && legacyUrl) files.push({ url: legacyUrl, name: legacyName || 'Attachment', size: 0, label: 'File' });
  if (!files.length) return <span className="text-bp-muted">—</span>;
  return <div className="flex flex-wrap justify-center gap-1">{files.map(file => <AttachmentFileLink key={`${file.label}-${file.name}`} file={file} label={file.label} />)}</div>;
};

export const AttachmentSections: React.FC<AttachmentSectionsProps> = ({
  value,
  onChange,
  onUploadFile,
  disabled = false
}) => {
  const [uploading, setUploading] = useState<'invoice' | 'dc' | 'images' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ file: TransactionAttachment; url: string } | null>(null);
  const invoiceRef = useRef<HTMLInputElement>(null);
  const dcRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef<HTMLInputElement>(null);

  const uploadFiles = async (kind: 'invoice' | 'dc' | 'images', files: FileList | null) => {
    if (!files?.length) return;
    try {
      setUploading(kind);
      setError(null);
      const uploaded: TransactionAttachment[] = [];
      for (const file of Array.from(files)) {
        const result = await onUploadFile(file);
        uploaded.push({ ...result, type: file.type });
      }
      if (kind === 'invoice') onChange({ ...value, invoice: uploaded[0] });
      else if (kind === 'dc') onChange({ ...value, dc: uploaded[0] });
      else {
        const existing = value.images;
        const additions = uploaded.filter(file => !existing.some(item => item.name === file.name && item.size === file.size));
        onChange({ ...value, images: [...existing, ...additions] });
      }
    } catch (err: any) {
      setError(err.message || 'File upload failed.');
    } finally {
      setUploading(null);
    }
  };

  const remove = (kind: 'invoice' | 'dc' | 'images', index?: number) => {
    if (kind === 'invoice') onChange({ ...value, invoice: undefined });
    else if (kind === 'dc') onChange({ ...value, dc: undefined });
    else onChange({ ...value, images: value.images.filter((_, itemIndex) => itemIndex !== index) });
  };

  const renderFile = (file: TransactionAttachment, kind: 'invoice' | 'dc' | 'images', index?: number) => (
    <div key={`${file.name}-${file.size}-${index ?? kind}`} className="flex items-center gap-2 rounded-lg border border-bp-border bg-white p-2 text-xs">
      <AttachmentFileLink file={file} label={file.name} compact={kind === 'images'} onPreview={(previewFile, url) => setPreview({ file: previewFile, url })} />
      <span className="min-w-0 flex-1 truncate font-medium" title={file.name}>{(file.size / 1024).toFixed(0)} KB</span>
      <button type="button" onClick={() => remove(kind, index)} disabled={disabled} title="Remove attachment" className="text-bp-muted hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
    </div>
  );

  return (
    <div aria-busy={uploading !== null} className="space-y-3 rounded-xl border border-bp-border bg-white p-3">
      <div className="text-[11px] font-bold uppercase tracking-wider text-bp-text">Attachments</div>
      {error && <div className="rounded-lg bg-red-50 p-2 text-xs text-red-700">{error}</div>}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {(['invoice', 'dc'] as const).map(kind => {
          const file = value[kind];
          const inputRef = kind === 'invoice' ? invoiceRef : dcRef;
          return (
            <div key={kind} className="space-y-1.5">
              <div className="text-xs font-semibold text-bp-text">{kind === 'invoice' ? 'Invoice' : 'DC (Delivery Challan)'}</div>
              {file ? renderFile(file, kind) : <button type="button" disabled={disabled || uploading !== null} onClick={() => inputRef.current?.click()} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-bp-border-strong p-2 text-xs text-bp-muted hover:border-bp-cyan hover:text-bp-text"><Upload className="h-3.5 w-3.5" />{uploading === kind ? 'Uploading...' : 'Upload PDF, JPG, JPEG or PNG'}</button>}
              <input ref={inputRef} type="file" accept={documentAccept} className="hidden" disabled={disabled} onChange={e => uploadFiles(kind, e.target.files)} />
            </div>
          );
        })}
      </div>
      <div className="space-y-1.5">
        <div className="text-xs font-semibold text-bp-text">Images</div>
        <button type="button" disabled={disabled || uploading !== null} onClick={() => imagesRef.current?.click()} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-bp-border-strong p-2 text-xs text-bp-muted hover:border-bp-cyan hover:text-bp-text"><ImagePlus className="h-3.5 w-3.5" />{uploading === 'images' ? 'Uploading...' : 'Add JPG, JPEG or PNG images'}</button>
        <input ref={imagesRef} type="file" accept={imageAccept} multiple className="hidden" disabled={disabled} onChange={e => uploadFiles('images', e.target.files)} />
        {value.images.length > 0 && <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{value.images.map((file, index) => renderFile(file, 'images', index))}</div>}
      </div>
      {preview && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-bp-navy-deep/75 p-4 sm:p-8" role="dialog" aria-modal="true" aria-label="Image preview">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-bp-border bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-bp-border px-4 py-3 sm:px-5">
              <p className="min-w-0 truncate text-sm font-semibold text-bp-text" title={preview.file.name}>{preview.file.name}</p>
              <button type="button" onClick={() => setPreview(null)} className="min-h-10 shrink-0 rounded-lg border border-bp-border px-3 text-xs font-semibold text-bp-text hover:bg-bp-background">Close</button>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center bg-bp-background p-2 sm:p-4">
              <img src={preview.url} alt={preview.file.name} className="max-h-[calc(92vh-88px)] max-w-full rounded-lg object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
