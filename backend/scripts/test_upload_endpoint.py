import requests
import os

# Create a dummy file
filename = "test_upload.txt"
with open(filename, "w") as f:
    f.write("This is a test file contents.")

url = "http://127.0.0.1:8000/api/v1/upload"
files = {"file": open(filename, "rb")}

try:
    print(f"Uploading {filename} to {url}...")
    response = requests.post(url, files=files)

    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")

    if response.status_code == 200:
        data = response.json()
        uploaded_url = data.get("url")
        print(f"Upload successful. Returned URL: {uploaded_url}")

        # Verify file exists on disk (assuming default location)
        # Note: The server is running locally within this environment so we can check disk.
        # However, the script is running in the same Cwd as backend usually.
        # But wait, backend/static/uploads is where it should be.

        if uploaded_url:
            # The URL is /static/uploads/uuid.ext
            # Need to map to local path to verify
            relative_path = uploaded_url.lstrip("/")  # Remove leading slash
            # e.g. static/uploads/xyz.txt

            # Assuming script ran from e:\Py\Delivery-System-III directory
            full_path = os.path.abspath(relative_path)
            if os.path.exists(full_path):
                print(f"SUCCESS: File confirmed on disk at {full_path}")
            else:
                # Try backend/static/uploads if running from root
                backend_path = os.path.join("backend", relative_path)
                if os.path.exists(backend_path):
                    print(f"SUCCESS: File confirmed on disk at {backend_path}")
                else:
                    print(
                        f"WARNING: Could not find file on disk at {full_path} or {backend_path}. Check server CWD."
                    )

    else:
        print("Upload failed.")

except Exception as e:
    print(f"An error occurred: {e}")
finally:
    files["file"].close()
    if os.path.exists(filename):
        os.remove(filename)
