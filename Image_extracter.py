import fitz  # PyMuPDF library for PDF processing
import os      # For interacting with the operating system
import io      # For handling byte streams
import base64  # For encoding binary image data into Base64 strings

def extract_images_from_pdf_standalone(pdf_path):
    """
    Extracts images from a PDF document and returns them as a list of dictionaries,
    where each dictionary contains the Base64 encoded image data, its extension,
    page number, and image index.

    This function is designed to be a standalone utility and does NOT save images to disk.
    It prepares image data for use by other applications (e.g., embedding in HTML,
    sending via API, or directly displaying in Colab/Jupyter).

    Args:
        pdf_path (str): The path to the PDF file from which to extract images.

    Returns:
        list: A list of dictionaries. Each dictionary has the following keys:
              - 'data': The Base64 encoded string of the image.
              - 'ext': The file extension of the image (e.g., 'png', 'jpeg', 'jpg').
              - 'page_num': The 1-based page number where the image was found.
              - 'image_index': The 1-based index of the image on that page.
              Returns an empty list if no images are found or if an error occurs.
    """
    extracted_images_data = []
    
    try:
        doc = fitz.open(pdf_path)

        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            image_list = page.get_images(full=True) 

            for img_index, img_info in enumerate(image_list):
                xref = img_info[0]

                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]
                image_ext = base_image["ext"]

                base64_encoded_image = base64.b64encode(image_bytes).decode('utf-8')

                extracted_images_data.append({
                    "data": base64_encoded_image,
                    "ext": image_ext,
                    "page_num": page_num + 1, 
                    "image_index": img_index + 1
                })
                # print(f"Extracted image {img_index+1} from page {page_num+1} (Base64 encoded).") # Removed for cleaner console output

        doc.close()

    except Exception as e:
        if "Empty part" in str(e):
            print(f"Error: Empty or corrupted PDF - {e}")
        else:
            print(f"Unexpected error: {e}")

    return extracted_images_data
