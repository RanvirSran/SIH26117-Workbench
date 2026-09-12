export type FileKind = 'pdf' | 'doc' | 'xls' | 'text' | 'other';

export function getFileKind(filename: string): FileKind {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'doc' || ext === 'docx') return 'doc';
  if (ext === 'xls' || ext === 'xlsx' || ext === 'csv') return 'xls';
  if (ext === 'txt' || ext === 'md') return 'text';
  return 'other';
}

export function fileKindLabel(kind: FileKind): string {
  switch (kind) {
    case 'pdf':
      return 'PDF';
    case 'doc':
      return 'DOC';
    case 'xls':
      return 'XLS';
    case 'text':
      return 'TXT';
    default:
      return 'FILE';
  }
}

export function formatFileSize(bytes?: number): string {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
