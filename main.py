from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from routes import pdf, highlights, realtime

app = FastAPI()

# Add CORS middleware with file size configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    response = await call_next(request)
    return response

app.include_router(pdf.router, prefix="/pdfs", tags=["PDFs"])
app.include_router(highlights.router, prefix="/highlights", tags=["Highlights"])
app.include_router(realtime.router, prefix="/realtime", tags=["Realtime"])

@app.get("/")
def root():
    return {"message": "PDF Highlighter API is running"}
