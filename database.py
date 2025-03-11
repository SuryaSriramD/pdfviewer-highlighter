import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from motor.motor_asyncio import AsyncIOMotorGridFSBucket

# Load environment variables
load_dotenv()

# Get MongoDB Atlas URI from environment variable
MONGO_URI = os.getenv('MONGODB_URI')
if not MONGO_URI:
    raise ValueError("MONGODB_URI environment variable is not set")

DB_NAME = "pdf_viewer"

# Initialize MongoDB Client
try:
    # Initialize client with MongoDB Atlas
    client = AsyncIOMotorClient(
        MONGO_URI,
        serverSelectionTimeoutMS=30000,
        maxPoolSize=10,
        retryWrites=True,
        connectTimeoutMS=20000
    )
    
    # Get Database Instance
    db = client[DB_NAME]
    
    # Initialize GridFS
    fs = AsyncIOMotorGridFSBucket(db)
    
    # Test the connection
    print(f"🔍 Connecting to MongoDB Atlas database: {DB_NAME}")
    client.admin.command('ping')
    print("✅ Successfully connected to MongoDB Atlas!")
    
except Exception as e:
    print(f"❌ Error connecting to MongoDB: {str(e)}")
    raise e

# Collections
highlights_collection = db["highlights"]
pdf_history_collection = db["pdf_history"]  # New collection for tracking PDF access history
