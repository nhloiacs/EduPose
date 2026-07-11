import shutil
import uuid
import os
from pathlib import Path
from fastapi import UploadFile, HTTPException
from typing import Set

class FileManager:
    ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif"}

    @staticmethod
    def save_file(file: UploadFile, upload_dir: str) -> str:
        if not file.filename:
            raise HTTPException(status_code=400, detail="Nama file tidak valid")

        file_extension = Path(file.filename).suffix.lower()
        if file_extension not in FileManager.ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400, 
                detail=f"Tipe file tidak diizinkan. Hanya {', '.join(FileManager.ALLOWED_EXTENSIONS)}"
            )

        directory = Path(upload_dir)
        directory.mkdir(parents=True, exist_ok=True)
        
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = directory / unique_filename

        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Gagal menyimpan file: {str(e)}")

        return f"/{directory.as_posix().replace('app/', '')}/{unique_filename}"

    @staticmethod
    def delete_file(photo_filepath: str) -> None:
        if not photo_filepath:
            return
            
        try:
            relative_path = photo_filepath.lstrip("/")
            file_path = Path("app") / relative_path
            
            if file_path.exists():
                os.remove(file_path)
        except Exception as e:
            print(f"Gagal hapus file: {e}")