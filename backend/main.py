import os
import io
import uuid
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse, FileResponse
from PIL import Image
import numpy as np
from rembg import new_session, remove
import zipfile
from fastapi.staticfiles import StaticFiles

app = FastAPI()

# CORS middleware to allow requests from frontend
origins = [
    "http://localhost:8000",  # Backend
    "http://localhost:5173",   # Frontend (e.g., React Vite)
    "https://rembg.nabilaba.my.id",  # Production URL
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve /assets/... and other static files
os.makedirs("dist/assets", exist_ok=True)
app.mount("/assets", StaticFiles(directory="dist/assets"), name="assets")

# Serve index.html at /
@app.get("/")
async def serve_index():
    return FileResponse(os.path.join("dist", "index.html"))
    
# Create temporary download folder
DOWNLOAD_DIR = "static/download"
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

def save_image_to_static(img: Image.Image, suffix=".png") -> str:
    filename = f"{uuid.uuid4().hex}{suffix}"
    path = os.path.join(DOWNLOAD_DIR, filename)
    img.save(path)
    return path

def file_path_to_download_url(filepath: str) -> str:
    filename = os.path.basename(filepath)
    return f"/download/{filename}"

@app.post("/remove-bg/")
async def remove_bg(file: UploadFile = File(...), model_name: str = Form("u2net")):
    # console model name like console.log(model_name)
    print(f"Model name: {model_name}")
    
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")

    contents = await file.read()
    session = new_session(model_name)
    result_bytes = remove(contents, session=session)
    output_image = Image.open(io.BytesIO(result_bytes)).convert("RGBA")

    # Crop transparent borders
    np_image = np.array(output_image)
    alpha = np_image[:, :, 3]
    non_transparent_coords = np.column_stack(np.where(alpha > 0))

    if non_transparent_coords.size > 0:
        top_left = non_transparent_coords.min(axis=0)
        bottom_right = non_transparent_coords.max(axis=0)
        cropped_image = output_image.crop((top_left[1], top_left[0], bottom_right[1], bottom_right[0]))
    else:
        cropped_image = output_image

    # Create variations
    mask = cropped_image.getchannel("A")
    mask_image = Image.merge("RGBA", (mask, mask, mask, mask))

    black_bg = Image.new("RGBA", cropped_image.size, (0, 0, 0, 255))
    white_bg = Image.new("RGBA", cropped_image.size, (255, 255, 255, 255))
    red_bg   = Image.new("RGBA", cropped_image.size, (255, 0, 0, 255))

    black_image = Image.composite(cropped_image, black_bg, mask)
    white_image = Image.composite(cropped_image, white_bg, mask)
    red_image   = Image.composite(cropped_image, red_bg, mask)

    def resize_and_center(image, target_size):
        target_width, target_height = target_size
        img_width, img_height = image.size
        img_aspect = img_width / img_height
        tgt_aspect = target_width / target_height

        if img_aspect > tgt_aspect:
            new_width = target_width
            new_height = int(target_width / img_aspect)
        else:
            new_height = target_height
            new_width = int(target_height * img_aspect)

        resized = image.resize((new_width, new_height), Image.LANCZOS)
        background = Image.new("RGBA", target_size, (0, 0, 0, 0))
        offset = ((target_width - new_width) // 2, (target_height - new_height) // 2)
        background.paste(resized, offset, resized)
        return background

    a4_size = (2480, 3508)
    a3_size = (3508, 4961)

    # Save images
    file_paths = []
    original_path = save_image_to_static(cropped_image, ".png"); file_paths.append(original_path)
    a4_path = save_image_to_static(resize_and_center(cropped_image, a4_size), ".png"); file_paths.append(a4_path)
    a3_path = save_image_to_static(resize_and_center(cropped_image, a3_size), ".png"); file_paths.append(a3_path)
    mask_path = save_image_to_static(mask_image, ".png"); file_paths.append(mask_path)
    black_path = save_image_to_static(black_image, ".png"); file_paths.append(black_path)
    white_path = save_image_to_static(white_image, ".png"); file_paths.append(white_path)
    red_path = save_image_to_static(red_image, ".png"); file_paths.append(red_path)

    ico_filename = f"{uuid.uuid4().hex}.ico"
    ico_path = os.path.join(DOWNLOAD_DIR, ico_filename)
    cropped_image.save(ico_path, format='ICO', sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    file_paths.append(ico_path)

    # Create ZIP
    zip_filename = f"{uuid.uuid4().hex}.zip"
    zip_path = os.path.join(DOWNLOAD_DIR, zip_filename)
    with zipfile.ZipFile(zip_path, "w") as zipf:
        for path in file_paths:
            arcname = os.path.basename(path)
            zipf.write(path, arcname)

    # Return all download links
    return JSONResponse({
        "original": file_path_to_download_url(original_path),
        "a4": file_path_to_download_url(a4_path),
        "a3": file_path_to_download_url(a3_path),
        "mask": file_path_to_download_url(mask_path),
        "black_bg": file_path_to_download_url(black_path),
        "white_bg": file_path_to_download_url(white_path),
        "red_bg": file_path_to_download_url(red_path),
        "ico": file_path_to_download_url(ico_path),
        "zip": file_path_to_download_url(zip_path),
    })

@app.get("/download/{filename}")
async def download_file(filename: str):
    file_path = os.path.join(DOWNLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    def file_iterator():
        with open(file_path, "rb") as f:
            yield from f
        # try:
        #     os.remove(file_path)
        #     print(f"Deleted after download: {file_path}")
        # except Exception as e:
        #     print(f"Failed to delete {file_path}: {e}")

    return StreamingResponse(file_iterator(),
                             media_type="application/octet-stream",
                             headers={
                                 "Content-Disposition": f"attachment; filename={filename}"
                             })

# (Optional) Catch-all route for SPA (e.g., React Router, Vue Router)
@app.get("/{full_path:path}")
async def catch_all(full_path: str):
    index_path = os.path.join("dist", "index.html")
    return FileResponse(index_path)

# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

