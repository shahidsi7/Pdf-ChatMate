from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
import os
import google.generativeai as genai

# Import your extraction functions
from Pdf_extracter import extract_text_lines_as_array
from Image_extracter import extract_images_from_pdf_standalone

app = Flask(__name__)

# Enable CORS if needed for cross-origin requests
CORS(app, resources={r"/*": {"origins": "http://localhost:8000"}})

# ✅ Use OpenShift-safe path for file uploads
UPLOAD_FOLDER = os.environ.get("UPLOAD_FOLDER", "/tmp/uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
print(f"Using upload folder: {UPLOAD_FOLDER}")

# Gemini model state
model = None
current_active_api_key = None

def configure_gemini_model(api_key):
    try:
        genai.configure(api_key=api_key)
        return genai.GenerativeModel('gemini-2.0-flash')
    except Exception as e:
        print(f"Error configuring Gemini API: {e}")
        return None

@app.route('/')
def serve_index():
    return render_template('index.html')

@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)

@app.route('/upload', methods=['POST'])
def upload_file():
    gemini_api_key = request.form.get('gemini_api_key')
    if not gemini_api_key:
        return jsonify({"error": "Gemini API Key is missing"}), 400

    global model, current_active_api_key
    if model is None or current_active_api_key != gemini_api_key:
        model = configure_gemini_model(gemini_api_key)
        if model is None:
            return jsonify({"error": "Failed to configure Gemini API"}), 500
        current_active_api_key = gemini_api_key

    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    filepath = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(filepath)

    pages_lines = []
    extracted_images = []
    errors = []
    pdf_summary = "Could not generate summary."

    try:
        pages_lines = extract_text_lines_as_array(filepath)
    except Exception as e:
        errors.append(f"Error extracting text: {str(e)}")

    try:
        extracted_images = extract_images_from_pdf_standalone(filepath)
    except Exception as e:
        errors.append(f"Error extracting images: {str(e)}")

    gemini_content = []
    if pages_lines:
        text_for_gemini = "\n".join([" ".join(page) for page in pages_lines])
        gemini_content.append(f"Here is the text extracted from the PDF:\n{text_for_gemini}\n\n")
    else:
        gemini_content.append("No text was extracted from the PDF.\n\n")

    if extracted_images:
        gemini_content.append("Here are images extracted from the PDF:\n")
        for img_info in extracted_images:
            gemini_content.append({
                'mime_type': f'image/{img_info["ext"]}',
                'data': img_info["data"]
            })
            gemini_content.append("\n")

    initial_prompt = "Please provide an overall summary of the document in a concise bullet-point format. Also, identify any key images and briefly describe their content relevant to the document, including their page and index number if possible. Use Markdown for the bullet points."
    gemini_content.append(initial_prompt)

    try:
        response = model.generate_content(gemini_content)
        pdf_summary = response.text
    except Exception as e:
        errors.append(f"Error generating PDF summary: {str(e)}")
        pdf_summary = "Could not generate summary due to an API error."

    os.remove(filepath)

    return jsonify({
        "pages_lines": pages_lines,
        "extracted_images": extracted_images,
        "pdf_summary": pdf_summary,
        "warnings": errors
    })

@app.route('/chat', methods=['POST'])
def chat_with_gemini():
    gemini_api_key = request.headers.get('X-Gemini-Api-Key')
    if not gemini_api_key:
        return jsonify({"error": "Gemini API Key is missing"}), 400

    global model, current_active_api_key
    if model is None or current_active_api_key != gemini_api_key:
        model = configure_gemini_model(gemini_api_key)
        if model is None:
            return jsonify({"error": "Failed to configure Gemini API"}), 500
        current_active_api_key = gemini_api_key

    data = request.json
    user_message = data.get('message')
    pdf_text_context = data.get('pdf_text_context', [])
    pdf_image_context = data.get('pdf_image_context', [])

    if not user_message:
        return jsonify({"error": "No message provided"}), 400

    chat_history = []

    if pdf_text_context:
        text_context_str = "\n".join([" ".join(page) for page in pdf_text_context])
        chat_history.append({"role": "user", "parts": [f"Context from PDF text:\n{text_context_str}"]})

    if pdf_image_context:
        image_parts = []
        for img_info in pdf_image_context:
            image_parts.append({
                'mime_type': f'image/{img_info["ext"]}',
                'data': img_info["data"]
            })
        chat_history.append({"role": "user", "parts": ["Context from PDF images:"] + image_parts})

    chat_history.append({"role": "user", "parts": [user_message]})

    try:
        response = model.generate_content(chat_history)
        return jsonify({"response": response.text})
    except Exception as e:
        return jsonify({"error": f"Error communicating with Gemini: {str(e)}"}), 500
