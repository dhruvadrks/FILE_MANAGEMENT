from pathlib import Path
from pypdf import PdfReader
from docx import Document

def extract_text(file_path:Path,file_type:str):

    #check the file type
    if file_type=="application/pdf":

        #object to read the the text in file
        reader=PdfReader(file_path)

        text=""

        #Read the text
        for page in reader.pages:
            page_text = page.extract_text()

            if page_text:
                text += page_text + "\n"

        return text

    elif file_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":

        document=Document(file_path)

        text=""

        for paragraph in document.paragraphs:
            text += paragraph.text + "\n"

        return text

    elif file_type == "text/plain":

        return file_path.read_text(
            encoding="utf-8",
            errors="ignore"
        )

    else:
        raise ValueError("Unsupported file type for indexing")


