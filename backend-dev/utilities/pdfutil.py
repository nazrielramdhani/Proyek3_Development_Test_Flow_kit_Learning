from fpdf import FPDF
from PyPDF2 import PdfReader
from io import BytesIO
from utilities.utils import check_folder
import os


def validate_pdf_content(file_content: bytes) -> tuple[bool, str]:
    """
    Validasi apakah file adalah PDF yang valid dan tidak corrupt.
    
    Args:
        file_content: Bytes dari file yang diupload
        
    Returns:
        tuple: (is_valid: bool, error_message: str)
    """
    # 1. Cek magic bytes (header PDF harus dimulai dengan %PDF-)
    if not file_content.startswith(b'%PDF-'):
        return False, "File bukan PDF yang valid (header tidak sesuai)"
    
    # 2. Coba baca PDF untuk memastikan tidak corrupt
    try:
        pdf_reader = PdfReader(BytesIO(file_content))
        
        # Cek apakah PDF memiliki halaman
        if len(pdf_reader.pages) == 0:
            return False, "PDF tidak memiliki halaman"
        
        # Coba akses halaman pertama untuk memastikan bisa dibaca
        _ = pdf_reader.pages[0]
        
        return True, "PDF valid"
        
    except Exception as e:
        return False, f"PDF corrupt atau rusak: {str(e)}"


def create_pdf_data(file_name: str, title: str, listColumn: object, listKey: object, listData: object, listImageKey: list = []):
    check_folder("pdf_report")
    pdf = FPDF(orientation='L')
    pdf.add_page()
    # Set font
    pdf.set_font('Arial', 'B', 16)
    # Centered text in a framed 20*10 mm cell and line break
    # (width, height, text, border, ln, align:C,L,R )
    pdf.cell(20, 10, title, 0, 1, 'L')

    # Set Header
    # Set font
    pdf.set_font('Arial', 'B', 10)
    col_widths = tuple([col[1] for col in listColumn])
    with pdf.table(col_widths=col_widths) as table:
        row = table.row()
        for column, width in (listColumn):
            row.cell(str(column))

        # print(listKey)
        # Set Data
        # Set font
        pdf.set_font('Arial', '', 8)
        jml_rows = len(listData)
        for index_row in range(jml_rows):
            row = table.row()
            for key in (listKey):
                text = str(listData[index_row][key])

                if key not in listImageKey or text is None or text == '':
                    row.cell(text)
                else:
                    file_path = 'file_uploaded/'+text
                    if os.path.exists(file_path):
                        row.cell(img=file_path, img_fill_width=True)
                        # row.cell(img=file_path)
                    else:
                        row.cell(text)

    pdf.output(f'pdf_report/{file_name}.pdf', 'F')
