# PDF Viewer with Highlighting

A full-stack web application for viewing PDFs with text highlighting functionality. This application allows users to upload PDFs, view them in the browser, highlight text with customizable colors, and save highlights for future reference.

## Features

- PDF upload and storage
- PDF viewing with pagination
- Text highlighting with customizable colors
- Highlight persistence across sessions
- Real-time collaboration via WebSockets
- Responsive design

## Tech Stack

### Frontend
- **Next.js**: React framework for the web application
- **React**: JavaScript library for building user interfaces
- **react-pdf-viewer**: Library for rendering PDFs in the browser

### Backend
- **FastAPI**: Python-based web framework for building APIs
- **Motor**: Asynchronous MongoDB driver for Python
- **GridFS**: MongoDB's solution for storing large files (PDFs)
- **WebSockets**: For real-time collaboration features

### Database
- **MongoDB Atlas**: Cloud-hosted MongoDB database

## Installation

### Prerequisites
- Node.js (v14 or higher)
- Python (v3.8 or higher)
- MongoDB Atlas account

## Setup Instructions

### Frontend
1. Navigate to the project root
2. Run `npm install`
3. Run `npm run dev`

### Backend
1. Navigate to the backend directory
2. Create a virtual environment: `python -m venv env`
3. Activate the environment:
   - Windows: `env\Scripts\activate`
   - Unix/MacOS: `source env/bin/activate`
4. Install dependencies: `pip install -r requirements.txt`
5. Set up MongoDB connection in `.env` file
6. Run the server: `uvicorn main:app --reload --port 8000`
7. The backend API will be available at `http://localhost:8000`

## Usage

1. **Upload a PDF**:
   - Go to the home page
   - Click "Upload PDF" and select a PDF file
   - The application will upload and redirect to the viewer

2. **View a PDF**:
   - Navigate through pages using the controls
   - Adjust zoom level as needed

3. **Highlight Text**:
   - Click the highlight tool in the toolbar
   - Select text in the PDF
   - Click the "Highlight" button that appears
   - Choose a color from the color picker

4. **View Saved Highlights**:
   - Highlights are automatically saved
   - They will be visible whenever you view the same PDF

## Project Structure

# Updated Project Structure for README.md
```
pdf-viewer-project/
├── components/                # React components
│   ├── PdfHighlighter.tsx      # Highlighting functionality
│   ├── PdfToolbar.tsx          # Toolbar with tools
│   └── PdfViewer.tsx           # Main PDF viewer component
├── pages/                     # Next.js pages
│   ├── _app.tsx                # Custom app component
│   ├── index.tsx               # Home page with upload
│   └── view/
        └── [id].tsx           # Dynamic PDF viewer page
├── public/                    # Static assets
│   └── pdfs/                  # PDF worker files
│       ├── pdf.worker.js      # PDF.js worker
│       └── pdf.worker.min.js  # Minified PDF.js worker
├── routes/                    # Backend API routes
│   ├── highlights.py          # Highlight management
│   ├── pdf.py                 # PDF upload/retrieval
│   └── realtime.py            # WebSocket for real-time
├── styles/                    # CSS styles
│   └── global.css             # Global CSS styles
├── .env                       # Environment variables
├── .gitignore                 # Git ignore file
├── database.py                # Database connection
├── main.py                    # FastAPI main application
├── package.json               # Node.js dependencies
├── package-lock.json          # Dependency lock file
├── requirements.txt           # Python dependencies
└── _pycache_/                 # Python cache files
```
(For Reference)
1. Frontend components in the `components/` directory
2. Next.js pages in the `pages/` directory
3. Backend routes in the `routes/` directory
4. PDF worker files in the `public/pdfs/` directory
5. Styles in the `styles/` directory
6. Configuration files at the root level


## API Endpoints

- `POST /pdfs/upload/`: Upload a new PDF
- `GET /pdfs/pdf/{pdf_id}`: Retrieve a PDF by ID
- `POST /pdfs/highlights/`: Save highlights for a PDF
- `GET /pdfs/highlights/{pdf_id}`: Get highlights for a PDF
- `WebSocket /realtime/ws/{pdf_id}`: Real-time highlight updates


## Acknowledgments

- [react-pdf-viewer](https://react-pdf-viewer.dev/) for PDF rendering
- [FastAPI](https://fastapi.tiangolo.com/) for the backend API
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) for database hosting

---
