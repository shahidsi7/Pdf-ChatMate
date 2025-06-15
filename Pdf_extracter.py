import fitz  # PyMuPDF

def extract_text_lines_as_array(pdf_path):
    """
    Extracts text from a PDF document, splitting each page's content
    into an array of lines, where each line is treated as a sentence
    separated by a full stop (period).

    Args:
        pdf_path (str): The path to the PDF file.

    Returns:
        list: A list of lists, where each inner list represents a page,
              and contains strings, each being a sentence from that page.
    """
    doc = fitz.open(pdf_path)
    pages_lines = []

    for page_num, page in enumerate(doc, start=1):
        page_text = page.get_text()

        # Split the page text by full stops.
        # This will create a list of strings, where each string is
        # a segment of text that was before a full stop.
        sentences = page_text.split('.')

        # Process each segment to form complete sentences and clean them up
        processed_lines = []
        for i, sentence_segment in enumerate(sentences):
            # Trim whitespace from the beginning and end of the segment
            cleaned_segment = sentence_segment.strip()

            # If it's not the last segment, re-add the full stop
            # and ensure it's not an empty string after cleaning
            if cleaned_segment: # Only add if the segment is not empty
                if i < len(sentences) - 1:
                    # Re-add the period to form a complete sentence
                    processed_lines.append(cleaned_segment + '.')
                else:
                    # For the last segment, if it's not empty, add it as is.
                    # It might not end with a period if the original text didn't.
                    processed_lines.append(cleaned_segment)

        # Filter out any empty strings that might result from multiple periods
        # or leading/trailing periods in the original text.
        # Ensure that only non-empty strings are added to the list of lines.
        final_lines_for_page = [line for line in processed_lines if line]

        pages_lines.append(final_lines_for_page)

    doc.close() # Close the document after processing
    return pages_lines
