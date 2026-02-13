from fastapi import FastAPI, UploadFile, File
import uvicorn

app = FastAPI()

@app.post("/verify")
async def verify_face(file: UploadFile = File(...)):
    # In a real impl, save file, run DeepFace.verify
    return {"status": "mock_verified", "match": True, "confidence": 0.98}

@app.post("/embed")
async def generate_embedding(file: UploadFile = File(...)):
    # In a real impl, run DeepFace.represent
    # Return 128-d or 512-d vector
    mock_vector = [0.1] * 512
    return {"embedding": mock_vector}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001