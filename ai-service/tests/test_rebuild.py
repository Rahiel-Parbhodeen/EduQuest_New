import sys,zipfile,json
from pathlib import Path
import pytest
sys.path.insert(0,str(Path(__file__).parents[1]))
from extract_text import extract
from app import MockProvider,QuizRequest,canonical_source_excerpt,best_source_excerpt,quiz_prompt
TEXT='Normalization removes transitive dependencies from relational tables. Indexing accelerates selective searches through large datasets. Transactions preserve consistency during concurrent updates.'
def test_source_grounded_offline_questions():
    result=MockProvider().generate_quiz(QuizRequest(extracted_text=TEXT,question_count=2,difficulty='hard'))
    assert len(result.questions)==2
    assert all(q.difficulty_level==5 for q in result.questions)
    assert all(next(o.option_text for o in q.options if o.is_correct) in TEXT for q in result.questions)
    assert result.questions[0].question_text!=result.questions[1].question_text

def test_short_content_fails_instead_of_inventing_questions():
    with pytest.raises(RuntimeError,match='Not enough'):MockProvider().generate_quiz(QuizRequest(extracted_text='short',question_count=5))

def test_prompt_supplies_schema_count_difficulty_and_boundary():
    text=quiz_prompt(QuizRequest(extracted_text=TEXT,question_count=7,difficulty='hard'))
    assert 'exactly 7' in text and 'hard difficulty' in text and 'difficulty_level' in text and '<material>' in text

def test_provider_citation_normalisation_maps_to_exact_original_span():
    candidate='NORMALIZATION removes transitive dependencies, from relational tables'
    assert canonical_source_excerpt(candidate,TEXT)==TEXT.split('.')[0]

def test_provider_citation_maps_unicode_compatibility_characters():
    source='The ﬁrst database key uniquely identifies each row in the table.'
    candidate='The first database key uniquely identifies each row in the table'
    assert canonical_source_excerpt(candidate,source)==source[:-1]

def test_provider_citation_maps_pdf_hyphenated_line_breaks():
    source='The inter-\nnational system performs reliable security checks.'
    candidate='The international system performs reliable security checks'
    assert canonical_source_excerpt(candidate,source)==source[:-1]

def test_fallback_citation_uses_answer_and_explanation_terms():
    source='ATP, or adenosine triphosphate, stores chemical energy for cellular processes.'
    query='How is energy stored? Cellular respiration produces ATP. ATP stores energy through adenosine triphosphate.'
    assert best_source_excerpt(query,source)==source

def test_generation_canonicalizes_provider_citation_before_return(monkeypatch):
    import app
    monkeypatch.setenv('AI_PROVIDER','mock')
    result=MockProvider().generate_quiz(QuizRequest(extracted_text=TEXT,question_count=1))
    exact=result.questions[0].source_excerpt
    result.questions[0].source_excerpt=exact.upper().replace('.','')
    canonical=canonical_source_excerpt(result.questions[0].source_excerpt,TEXT)
    class FakeProvider:
        def generate_quiz(self,request):return result
    monkeypatch.setattr(app,'provider',lambda:FakeProvider())
    generated=app.generate_quiz(QuizRequest(extracted_text=TEXT,question_count=1))
    assert generated.questions[0].source_excerpt==canonical

@pytest.mark.parametrize('kind,entry,xml',[('docx','word/document.xml','<w:document xmlns:w="urn:w"><w:p><w:r><w:t>'+TEXT+'</w:t></w:r></w:p></w:document>'),('pptx','ppt/slides/slide1.xml','<a:slide xmlns:a="urn:a"><a:p><a:r><a:t>'+TEXT+'</a:t></a:r></a:p></a:slide>')])
def test_office_text_extraction(tmp_path,kind,entry,xml):
    file=tmp_path/('source.'+kind)
    with zipfile.ZipFile(file,'w') as z:z.writestr(entry,xml)
    assert TEXT in extract(file,kind)

def test_text_extraction_rejects_empty_and_oversized(tmp_path):
    file=tmp_path/'notes.txt';file.write_text(TEXT,encoding='utf-8');assert extract(file,'txt')==TEXT
    file.write_text('');
    with pytest.raises(ValueError,match='readable'):extract(file,'txt')
    file.write_text('a'*500001)
    with pytest.raises(ValueError,match='500,000'):extract(file,'txt')

def test_large_study_guide_text_above_previous_limit_is_read(tmp_path):
    file=tmp_path/'study-guide.txt'
    material=('Computer networks transmit data between devices. ' * 3000).strip()
    assert 120000 < len(material) < 500000
    file.write_text(material,encoding='utf-8')
    assert extract(file,'txt') == material

def test_blank_pdf_rejects_scanned_or_empty_content(tmp_path):
    from pypdf import PdfWriter
    file=tmp_path/'empty.pdf';writer=PdfWriter();writer.add_blank_page(width=100,height=100);writer.write(file)
    with pytest.raises(ValueError,match='OCR'):extract(file,'pdf')


def test_text_based_pdf_extracts_learning_material(tmp_path):
    text='Normalization removes transitive dependencies from relational tables.'
    stream=('BT /F1 12 Tf 20 80 Td ('+text+') Tj ET').encode('ascii')
    objects=[b'<< /Type /Catalog /Pages 2 0 R >>',b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',b'<< /Length '+str(len(stream)).encode()+b' >>\nstream\n'+stream+b'\nendstream']
    content=b'%PDF-1.4\n';offsets=[0]
    for i,obj in enumerate(objects,1):
        offsets.append(len(content));content+=str(i).encode()+b' 0 obj\n'+obj+b'\nendobj\n'
    xref=len(content);content+=b'xref\n0 6\n0000000000 65535 f \n'+b''.join(f'{offset:010d} 00000 n \n'.encode() for offset in offsets[1:])+b'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+str(xref).encode()+b'\n%%EOF'
    file=tmp_path/'notes.pdf';file.write_bytes(content.replace(b'\\n',b'\n'))
    assert text in extract(file,'pdf')


def test_offline_questions_quote_the_actual_material():
    result=MockProvider().generate_quiz(QuizRequest(extracted_text=TEXT,question_count=2))
    assert all(q.source_excerpt in TEXT and len(q.source_excerpt)>=15 for q in result.questions)


def test_generation_reports_source_fingerprint_and_mode(monkeypatch):
    import hashlib,app
    monkeypatch.setenv('AI_PROVIDER','mock');app.provider.cache_clear()
    result=app.generate_quiz(QuizRequest(extracted_text=TEXT,question_count=2))
    assert result.generation_mode=='offline'
    assert result.source_sha256==hashlib.sha256(TEXT.encode()).hexdigest()
    assert result.source_characters==len(TEXT)


def test_generation_replaces_unmatched_provider_quote_with_source_span(monkeypatch):
    import app
    from fastapi import HTTPException
    result=MockProvider().generate_quiz(QuizRequest(extracted_text=TEXT,question_count=1))
    result.questions[0].source_excerpt='Unrelated material invented by the provider.'
    class FakeProvider:
        def generate_quiz(self,request):return result
    monkeypatch.setattr(app,'provider',lambda:FakeProvider())
    result=app.generate_quiz(QuizRequest(extracted_text=TEXT,question_count=1))
    assert result.questions[0].source_excerpt in TEXT


def test_status_distinguishes_offline_and_unconfigured_live(monkeypatch):
    import app
    monkeypatch.setenv('AI_PROVIDER','mock');assert app.generation_status()['mode']=='offline'
    monkeypatch.setenv('AI_PROVIDER','openai');monkeypatch.delenv('OPENAI_API_KEY',raising=False)
    assert app.generation_status()['configured'] is False
    assert 'key' not in app.generation_status()


def test_live_mode_without_key_fails_before_calling_provider(monkeypatch):
    import app
    from fastapi import HTTPException
    monkeypatch.setenv('AI_PROVIDER','openai');monkeypatch.delenv('OPENAI_API_KEY',raising=False)
    with pytest.raises(HTTPException) as exc:app.generate_quiz(QuizRequest(extracted_text=TEXT,question_count=1))
    assert exc.value.status_code==503 and exc.value.detail=='AI_NOT_CONFIGURED'
