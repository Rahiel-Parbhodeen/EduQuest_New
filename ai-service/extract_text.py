"""Extract local uploaded material. No network or Office application required."""
import sys, json, zipfile, re, os
from pathlib import Path
from xml.etree import ElementTree as ET
MAX_TEXT=int(os.environ.get('DOCUMENT_MAX_TEXT_CHARS', '500000'))
MAX_EXPANDED=int(os.environ.get('DOCUMENT_MAX_EXPANDED_BYTES', str(200*1024*1024)))
MAX_PDF_PAGES=int(os.environ.get('DOCUMENT_MAX_PDF_PAGES', '1000'))
MAX_ARCHIVE_ENTRIES=int(os.environ.get('DOCUMENT_MAX_ARCHIVE_ENTRIES', '10000'))

def extract(path,kind):
    source=Path(path)
    if kind in {'txt','md'}:
        text=source.read_text(encoding='utf-8-sig')
    elif kind=='pdf':
        from pypdf import PdfReader
        reader=PdfReader(source)
        if len(reader.pages)>MAX_PDF_PAGES: raise ValueError(f'PDF exceeds {MAX_PDF_PAGES:,}-page limit.')
        text='\n'.join(page.extract_text() or '' for page in reader.pages)
    elif kind in {'docx','pptx'}:
        with zipfile.ZipFile(source) as archive:
            entries=archive.infolist()
            if sum(e.file_size for e in entries)>MAX_EXPANDED or len(entries)>MAX_ARCHIVE_ENTRIES:
                raise ValueError('Office archive expands beyond the safe limit.')
            names=['word/document.xml'] if kind=='docx' else sorted((n for n in archive.namelist() if re.fullmatch(r'ppt/slides/slide\d+\.xml',n)),key=lambda n:int(re.search(r'slide(\d+)\.xml$',n).group(1)))
            blocks=[]
            for name in names:
                root=ET.fromstring(archive.read(name))
                for node in root.iter():
                    if node.tag.rsplit('}',1)[-1]=='p':
                        blocks.append(' '.join(n.text for n in node.iter() if n.tag.rsplit('}',1)[-1]=='t' and n.text))
            text='\n'.join(blocks)
    else: raise ValueError('Unsupported document type.')
    text=text.strip()
    if len(text)<30: raise ValueError('Not enough readable text. Scanned PDFs need OCR; upload a text-based document.')
    if len(text)>MAX_TEXT: raise ValueError(f'Document exceeds {MAX_TEXT:,}-character limit; select relevant chapters and upload them as separate files.')
    return text
if __name__=='__main__':
    try: print(json.dumps({'text':extract(sys.argv[1],sys.argv[2])}))
    except Exception as exc:
        message=str(exc)
        code='DOCUMENT_NO_TEXT' if 'readable text' in message else 'DOCUMENT_TOO_LARGE' if any(word in message for word in ['limit','exceeds','expands']) else 'DOCUMENT_READ_FAILED'
        print(json.dumps({'error_code':code}));sys.exit(1)
