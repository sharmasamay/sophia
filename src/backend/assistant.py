# app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os

app = Flask(__name__)
CORS(app) # Enable CORS for all routes, allowing your React app to make requests

# --- Configuration ---
# Default API key (fallback, but frontend should provide the key)
DEFAULT_GEMINI_API_KEY = ""  
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

#Dictionary
def fetch_word_definition(word):
    url = f"https://api.dictionaryapi.dev/api/v2/entries/en/{word}"
    response = requests.get(url)

    if response.status_code == 200:
        data = response.json()
        results = {
            "word": data[0].get("word", ""),
            "meanings": []
        }

        for meaning in data[0].get("meanings", []):
            part_of_speech = meaning.get("partOfSpeech", "")
            definitions = []
            for d in meaning.get("definitions", []):
                definitions.append({
                    "definition": d.get("definition", ""),
                    "example": d.get("example", "")
                })
            results["meanings"].append({
                "partOfSpeech": part_of_speech,
                "definitions": definitions
            })

        return results
    else:
        return {"error": f"Word '{word}' not found."}

@app.route('/definition', methods=['GET'])
def get_definition():
    word = request.args.get('word')
    if not word:
        return jsonify({"error": "No word provided"}), 400

    result = fetch_word_definition(word)
    return jsonify(result)


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
        end_index = central_chunk_index
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
    book_chunks = data.get('book_chunks', [])
    api_key = data.get('api_key', DEFAULT_GEMINI_API_KEY)  # Get API key from request
    
    if not selected_text:
        return jsonify({"error": "No text selected for explanation."}), 400
    
    if not api_key:
        return jsonify({"error": "Gemini API Key not provided. Please set up your API key in the app settings."}), 400

    # Retrieve relevant context using the helper function
    context_for_explanation = get_context_for_explanation(selected_text, book_chunks, max_context_chunks=3)

    # --- Construct the detailed and intricate prompt ---
    prompt = f"""

    Help me understand the following passage from the book with the given context:
    ---
    **Book Title:** "{book_title}"
    **Book Context (relevant surrounding text for depth):**
    {context_for_explanation}
    ----
    **Selected Passage (the exact text the user highlighted for explanation):**
    {selected_text}
    ----

    **User's Implicit Request:** Use clear but concise language and give the answer in the following format
    What it means:
    How it fits in:
    """
    try:
        headers = {
            "Content-Type": "application/json"
        }
        payload = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}]
        }
        
        # Make the API call to Gemini using the provided API key
        response = requests.post(f"{GEMINI_API_URL}?key={api_key}", headers=headers, json=payload)
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
    

@app.route('/chat', methods=['POST'])
def chat_with_book():
    if request.method == 'OPTIONS': # Handle CORS preflight
        response = jsonify({'message': 'CORS preflight successful'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        return response

    data = request.json
    user_query = data.get('user_query')
    book_title = data.get('book_title', 'Untitled Book')
    book_chunks = data.get('book_chunks', [])
    api_key = data.get('api_key', DEFAULT_GEMINI_API_KEY)  # Get API key from request
    
    if not user_query:
        return jsonify({"error": "No query provided for chat."}), 400
    
    if not api_key:
        return jsonify({"error": "Gemini API Key not provided. Please set up your API key in the app settings."}), 400

    # Step 1: Retrieve relevant chunks (scoring-based RAG, similar to /explain)
    cleaned_query_terms = clean_query(user_query)

    context = ""
    if cleaned_query_terms: # Only get context if query is meaningful
        scored_chunks = []
        for chunk in book_chunks:
            score = 0
            lower_case_chunk = chunk.lower()
            for term in cleaned_query_terms:
                if term in lower_case_chunk:
                    score += 1
            if score > 0:
                scored_chunks.append({"chunk": chunk, "score": score})
        
        # Sort by score in descending order and select top 5 chunks
        top_relevant_chunks = sorted(scored_chunks, key=lambda x: x["score"], reverse=True)[:5]
        context = "\n\n".join([item["chunk"] for item in top_relevant_chunks])
    
    if not context:
        context = "No highly relevant text found in the book for this query. The answer might be general knowledge or outside the book's scope."

    # Step 2: Construct the prompt for the general chatbot
    prompt = f"""
    You are a helpful reading assistant. Your primary role is to answer questions based on the content of the book provided.

    **Instructions:**
    1.  Answer the user's question directly and concisely, using the provided "Book Context."
    2.  If the answer is NOT explicitly present in the "Book Context," state that you cannot answer based on the provided information. Do NOT make up information.
    3.  Keep your response to a maximum of 3-4 sentences.
    4.  Maintain a friendly and informative tone.

    ---
    **Book Title:** "{book_title}"
    **Book Context (relevant sections for your answer):**
    {context}

    **User Question:** {user_query}
    ---
    **Response:**
    """

    try:
        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}]
        }
        
        # Make the API call to Gemini using the provided API key
        response = requests.post(f"{GEMINI_API_URL}?key={api_key}", headers=headers, json=payload)
        response.raise_for_status()
        gemini_result = response.json()
        
        bot_response_text = "Sorry, I couldn't get a response from the AI. Please try again."
        raw_ai_response = ""

        if gemini_result.get('candidates') and len(gemini_result['candidates']) > 0 and \
           gemini_result['candidates'][0].get('content') and \
           gemini_result['candidates'][0]['content'].get('parts') and \
           len(gemini_result['candidates'][0]['content']['parts']) > 0:
            raw_ai_response = gemini_result['candidates'][0]['content']['parts'][0]['text']

        # Look for the "Response:" marker and extract content after it
        marker = "Response:\n"
        marker_index = raw_ai_response.find(marker)

        if marker_index != -1:
            bot_response_text = raw_ai_response[marker_index + len(marker):].strip()
        else:
            print("Warning: Chatbot response marker not found. Using raw AI response.")
            bot_response_text = raw_ai_response.strip() # Fallback

        if not bot_response_text:
            bot_response_text = "The AI generated an empty response for your chat query. Please try again."

        return jsonify({"bot_response_text": bot_response_text}), 200

    except requests.exceptions.RequestException as e:
        print(f"API request failed for chat: {e}")
        return jsonify({"error": f"Failed to connect to AI service for chat: {e}"}), 500
    except Exception as e:
        print(f"An unexpected error occurred in chat endpoint: {e}")
        return jsonify({"error": f"An internal server error occurred for chat: {e}"}), 500

if __name__ == '__main__':
    # Explanation server runs on port 5000
    print("Starting Explanation Server on port 5000...")
    app.run(debug=False, port=5000, host='0.0.0.0')