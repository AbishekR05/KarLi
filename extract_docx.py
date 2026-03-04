import zipfile
import xml.etree.ElementTree as ET
import sys
import glob

def extract_text_from_docx(docx_path):
    try:
        with zipfile.ZipFile(docx_path) as z:
            xml_content = z.read('word/document.xml')
            tree = ET.fromstring(xml_content)
            
            # XML namespace for Word
            namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            
            paragraphs = []
            for paragraph in tree.findall('.//w:p', namespaces):
                texts = [node.text for node in paragraph.findall('.//w:t', namespaces) if node.text]
                if texts:
                    paragraphs.append(''.join(texts))
            return '\n'.join(paragraphs)
    except Exception as e:
        return f"Error extracting from {docx_path}: {str(e)}"

if __name__ == "__main__":
    if len(sys.argv) > 1:
        files = sys.argv[1:]
    else:
        files = glob.glob(r"d:\Full Stack\KarLi\Documentation\*.docx")
    
    with open("docx_contents.txt", "w", encoding="utf-8") as out_f:
        for f in files:
            out_f.write(f"--- {f} ---\n")
            out_f.write(extract_text_from_docx(f) + "\n\n\n")
