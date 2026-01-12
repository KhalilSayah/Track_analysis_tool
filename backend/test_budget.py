import requests
import json

url = "http://localhost:8000/api/v1/budget/chat"
payload = {
    "messages": [
        {"role": "user", "content": "Add 300 EUR for tires"}
    ]
}

try:
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
