from flask import Flask, request, jsonify
import requests
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
# Function to fetch and parse the definition
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

# Flask route to expose the definition as an API
@app.route('/api/definition', methods=['GET'])
def get_definition():
    word = request.args.get('word')
    if not word:
        return jsonify({"error": "No word provided"}), 400

    result = fetch_word_definition(word)
    return jsonify(result)

# Run the app
if __name__ == '__main__':
    app.run(debug=True, port=5001)  # Changed to port 5001