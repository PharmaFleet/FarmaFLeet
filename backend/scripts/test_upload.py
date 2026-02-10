import requests

# Adjust URL if needed
API_URL = "http://localhost:8000/api/v1"
UPLOAD_URL = f"{API_URL}/upload"


def test_upload():
    # Create a dummy file
    files = {"file": ("test_image.txt", b"This is a test image content", "text/plain")}

    try:
        response = requests.post(UPLOAD_URL, files=files)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")

        if response.status_code == 200:
            print("Upload Successful!")
            url = response.json().get("url")
            print(f"File URL: {url}")
            # Verify we can access it
            # Note: Need correct port for static files if served by uvicorn
            # Uvicorn running on 8000
            file_access_url = f"http://localhost:8000{url}"
            file_resp = requests.get(file_access_url)
            print(f"File Access Status: {file_resp.status_code}")
            if file_resp.status_code == 200:
                print("File Access Successful!")
            else:
                print("Failed to access file.")
        else:
            print("Upload Failed.")

    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    test_upload()
