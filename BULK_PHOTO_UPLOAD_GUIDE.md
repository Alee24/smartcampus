# 📸 BULK PHOTO UPLOAD GUIDE (UPDATED)

## Overview
This feature allows you to bulk upload student profile photos using a **Mapping CSV** and a **ZIP Folder**.
This addresses the issue where camera filenames (e.g., `DSC_001.jpg`) do not match Student Admission Numbers.

---

## 📂 Requirements

### 1. The CSV Mapping File (`.csv`)
A simple CSV file that links the Admission Number to the Filename.
*   **Columns**: `Admission Number`, `Photo Filename`
*   **Example**:
    ```csv
    Admission Number, Photo Filename
    STD001, DSC_0054.jpg
    STD002, IMG_2024.png
    STD003, P10005.jpeg
    ```

### 2. The ZIP Folder (`.zip`)
A ZIP file containing the actual images listed in the CSV.
*   The system will look inside this ZIP for `DSC_0054.jpg`, `IMG_2024.png`, etc.
*   **Note**: Photos can be in subfolders inside the ZIP; the system will find them by name.

---

## 🚀 How to Upload

1.  Navigate to **Bulk Upload** in the dashboard.
2.  Go to **Step 7: Student Photos**.
3.  **Step 1**: Upload your **Mapping CSV**.
    -   You will see a Green Checkmark ✅ if valid.
4.  **Step 2**: Upload your **Images ZIP**.
    -   You will see a Green Checkmark ✅ if valid.
5.  Click **"Start Bulk Photo Upload"**.

The system will:
1.  Read the CSV.
2.  Find the corresponding image in the ZIP.
3.  Rename it securely (e.g., `profile_STD001_uuid.jpg`).
4.  Update the student's profile picture.

---

## ❓ Troubleshooting

*   **"No valid mapping found"**: Ensure your CSV has two columns and valid data.
*   **"File not found in ZIP"**: Check for typos in the CSV. If CSV says `photo.jpg` but ZIP has `Photo.JPG`, the system attempts to handle case-insensitivity, but exact matches are safest.
*   **"User not found"**: The Admission Number in the CSV does not exist in the database. Please register students first (Step 5).
