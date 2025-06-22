# app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os

app = Flask(__name__)
CORS(app) # Enable CORS for all routes, allowing your React app to make requests

# --- Configuration ---
# IMPORTANT: Replace "YOUR_GEMINI_API_KEY" with your actual Gemini API Key.
# It's highly recommended to use environment variables for API keys in production.
# For example: GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
GEMINI_API_KEY = "AIzaSyBTS69h23TZzjEFvzdcdXbDm_zTevAR7EU"
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

# --- Helper Functions (Copied from your React app's logic for consistency) ---
# Note: In a real backend, you might refine these or use a dedicated NLP library.
STOP_WORDS = {
  "a", "an", "the", "and", "but", "or", "for", "nor", "on", "at", "to", "from",
  "by", "in", "with", "of", "is", "are", "was", "were", "be", "been", "am",
  "my", "your", "his", "her", "its", "our", "their", "this", "that", "these",
  "those", "what", "where", "when", "why", "how", "who", "whom", "whose",
  "which", "if", "then", "else", "has", "have", "had", "do", "does", "did",
  "can", "could", "will", "would", "should", "might", "must", "as", "so", "up",
  "down", "out", "off", "about", "above", "below", "before", "after", "all",
  "any", "some", "such", "no", "not", "only", "own", "same", "too", "very",
  "just", "even", "more", "most", "few", "many", "much", "there", "here",
  "when", "where", "why", "how", "you", "i", "he", "she", "it", "we", "they",
  "me", "him", "her", "us", "them", "what", "who", "which", "whose", "whom",
  "said", "told", "asked", "replied", "answered", "began", "went", "came",
  "wouldn't", "don't", "didn't", "couldn't", "shouldn't", "isn't", "aren't", "wasn't", "weren't"
}

def clean_query(query):
    # Using regex that supports Unicode properties (similar to JS \p{L}\p{N}u)
    # This might require 'regex' module if 're' doesn't fully support all Unicode properties,
    # but for basic alphanumeric it's fine. For web, JS regex is typically more robust for this.
    # For simplicity here, we'll use a basic alphanumeric + whitespace regex.
    cleaned_words = []
    for word in query.lower().split():
        cleaned_word = ''.join(char for char in word if char.isalnum()) # Keep only alphanumeric
        if len(cleaned_word) > 2 and cleaned_word not in STOP_WORDS:
            cleaned_words.append(cleaned_word)
    return cleaned_words

def get_context_for_explanation(highlighted_text, book_chunks, max_context_chunks=3):
    if not highlighted_text or not book_chunks:
        return ''

    normalized_highlighted = highlighted_text.lower()

    # Find the central chunk that contains the highlighted text
    central_chunk_index = -1
    for i, chunk in enumerate(book_chunks):
        if normalized_highlighted in chunk.lower():
            central_chunk_index = i
            break

    context_chunks = []
    if central_chunk_index != -1:
        # Get chunks around the central chunk
        start_index = max(0, central_chunk_index - max_context_chunks)
        end_index = min(len(book_chunks) - 1, central_chunk_index + max_context_chunks)
        for i in range(start_index, end_index + 1):
            context_chunks.append(book_chunks[i])
    else:
        # Fallback: if selected text isn't perfectly within one chunk, use keywords to find relevant ones
        keywords = clean_query(highlighted_text)
        # Score chunks based on keyword presence
        scored_chunks = []
        for chunk in book_chunks:
            score = 0
            lower_case_chunk = chunk.lower()
            for keyword in keywords:
                if keyword in lower_case_chunk:
                    score += 1
            if score > 0:
                scored_chunks.append({"chunk": chunk, "score": score})
        
        # Sort and take the top ones
        top_scored_chunks = sorted(scored_chunks, key=lambda x: x["score"], reverse=True)[:max_context_chunks * 2 + 1]
        context_chunks = [item["chunk"] for item in top_scored_chunks]

    return "\n\n".join(context_chunks)

# --- Flask Endpoint for Explanation ---
@app.route('/explain', methods=['POST'])
def explain_text():
    if request.method == 'OPTIONS':
        # Handle preflight request for CORS
        response = jsonify({'message': 'CORS preflight successful'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        return response

    data = request.json
    selected_text = data.get('selected_text')
    book_title = data.get('book_title', 'Untitled Book')
    book_chunks = data.get('book_chunks', []) # Receive book chunks from frontend
    
    if not selected_text:
        return jsonify({"error": "No text selected for explanation."}), 400
    
    if not GEMINI_API_KEY or GEMINI_API_KEY == "YOUR_GEMINI_API_KEY":
        return jsonify({"error": "Gemini API Key is not configured on the server."}), 500

    # Retrieve relevant context using the helper function
    context_for_explanation = get_context_for_explanation(selected_text, book_chunks, max_context_chunks=3)
    print(context_for_explanation)

    # --- Construct the detailed and intricate prompt ---
    prompt = f"""
    You are a highly concise and helpful reading assistant. Your goal is to guide the user towards understanding a specific passage from a book, based *only* on the provided context. Do NOT give a direct definition or explicit explanation. Instead, act as a guide.

    **Instructions for your response:**
    1.  Refer strictly to the provided "Book Context" and "Selected Passage."
    2.  Your response must be **1-2 sentences long**, maximum 3 if absolutely necessary for clarity, but aim for shorter.
    3.  Use simple, accessible language. Avoid jargon unless it's explicitly from the provided text.
    4.  Guide the user towards understanding by:
        * Drawing attention to related ideas or phrases *within the "Book Context."*
        * Posing 1-2 concise, thought-provoking questions about the "Selected Passage" or its connection to the surrounding text.
        * Suggesting *what* the user might consider or look for to deepen their understanding.
    5.  Do NOT directly define the term or concept in the "Selected Passage."
    6.  If the provided "Book Context" and "Selected Passage" genuinely lack sufficient information to provide a guiding explanation, state: "This passage requires more context from the book for a guiding explanation."

    ---
    **Book Title:** "{book_title}"
    **Book Context (relevant surrounding text for depth):**
    """
    {context_for_explanation}
    """

    **Selected Passage (the exact text the user highlighted for explanation):**
    """
    {selected_text}
    """

    **User's Implicit Request:** Help me understand this passage.
    """

    try:
        headers = {
            "Content-Type": "application/json"
        }
        payload = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}]
        }
        
        # Make the API call to Gemini
        response = requests.post(f"{GEMINI_API_URL}?key={GEMINI_API_KEY}", headers=headers, json=payload)
        response.raise_for_status() # Raise an HTTPError for bad responses (4xx or 5xx)
        
        gemini_result = response.json()
        
        explanation = "Sorry, I couldn't generate an explanation. Please try again."
        if gemini_result.get('candidates') and len(gemini_result['candidates']) > 0 and \
            gemini_result['candidates'][0].get('content') and \
            gemini_result['candidates'][0]['content'].get('parts') and \
            len(gemini_result['candidates'][0]['content']['parts']) > 0:
            explanation = gemini_result['candidates'][0]['content']['parts'][0]['text']
        
        return jsonify({"explanation": explanation}), 200

    except requests.exceptions.RequestException as e:
        print(f"API request failed: {e}")
        return jsonify({"error": f"Failed to connect to AI service: {e}"}), 500
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return jsonify({"error": f"An internal server error occurred: {e}"}), 500

if __name__ == '__main__':
    # Explanation server runs on port 5000
    print("Starting Explanation Server on port 5000...")
    app.run(debug=True, port=5000, host='127.0.0.1')