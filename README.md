File Management System

Description

File Management System is a web-based application that allows users to upload, manage, search, and share their files.

The application provides:

User registration and login

Email verification

Forgot password and password reset

File upload and download

File preview

File rename and deletion

Favorite files

Recycle bin

Filename search

Semantic content search

PDF and DOCX content indexing

Private file sharing

Share-link expiry

Share permissions

Share-link revocation

User profile management

The system also supports semantic content search for PDF and DOCX files. Uploaded documents are processed by extracting text, dividing it into chunks, generating embeddings, and storing the embeddings in a FAISS vector index for semantic search.

Technologies Used

Backend

Python

FastAPI

SQLAlchemy

Alembic

MySQL

Redis

FAISS

Sentence Transformers

Pydantic

Uvicorn

Frontend

Angular

TypeScript

HTML

CSS

Node.js

npm

Installation and Setup

Prerequisites

Install the following software before setting up the application:

Git

Python

Node.js

npm

MySQL

Redis

Make sure Python, Node.js, npm, MySQL, and Redis are available from the command line.

Clone the Repository

Clone the repository:

git clone <repository-url>

Navigate to the project directory:

cd FILE_MANAGEMENT

Backend Setup

Navigate to the backend directory:

cd BACKEND

Create a Virtual Environment

python -m venv venv

Activate the Virtual Environment

For Windows:

venv\Scripts\activate

For macOS/Linux:

source venv/bin/activate

Install Backend Dependencies

Install the dependencies from requirements.txt:

pip install -r requirements.txt

Environment Variables

Create a .env file in the project root.

Add the environment variables required by your local configuration, including database, secret-key, and Redis settings.

Do not commit the .env file to Git because it may contain sensitive information.

You can provide a .env.example file with placeholder values for other developers.

Database Setup

Create the MySQL database required by the application.

Configure the database connection in the .env file.

From the BACKEND directory, run the Alembic migrations:

alembic upgrade head

This applies the database migrations and creates the required database structure.

Redis Setup

Make sure Redis is installed and running.

Configure the Redis connection in the .env file.

The application can then use Redis for its Redis-related functionality.

Start the Backend

From the BACKEND directory, with the virtual environment activated:

uvicorn app.main:app --reload

The backend will be available at:

http://localhost:8000

FastAPI API documentation:

http://localhost:8000/docs

Frontend Setup

Open a new terminal.

Navigate to the Angular application:

cd FRONTEND/file-management-frontend

Install the frontend dependencies:

npm install

The dependencies are defined in package.json and locked using package-lock.json.

Start the Frontend

Run the Angular development server:

npm start

The frontend will be available at:

http://localhost:4200

Open the URL in a web browser to use the application.

Running the Application

Start the backend and frontend in separate terminals.

Terminal 1 — Backend

cd BACKEND
venv\Scripts\activate
uvicorn app.main:app --reload

Terminal 2 — Frontend

cd FRONTEND/file-management-frontend
npm start

Then open:

http://localhost:4200

Usage

After starting the application:

Register a user account.

Verify the account.

Log in.

Upload files.

View, download, rename, favorite, or delete files.

Search files by filename.

Use semantic search for supported PDF and DOCX documents.

Create private share links.

Grant access to specific email addresses.

Set share-link expiry.

Revoke share links when required.

Manage profile information.

Restore or permanently delete files from the recycle bin.

File Search

The application supports two types of search.

Filename Search

Search files based on their filenames.

Semantic Content Search

Search the content of supported documents based on meaning rather than only matching filenames.

The current content-search MVP supports:

PDF

DOCX

The semantic search process is:

Uploaded File
     ↓
Text Extraction
     ↓
Text Chunking
     ↓
Embedding Generation
     ↓
FAISS Vector Index
     ↓
Semantic Search
     ↓
Relevant Files

Files that are not supported for content indexing can still be uploaded and managed normally.

File Storage

During local development, uploaded files are stored in the backend storage directory.

The storage directory contains generated application data and user-uploaded files and should not be committed to Git.

Sharing

The application supports private file sharing through restricted share links.

Share links support:

Specific user permissions

Share-link expiry

Share-link revocation

Owner-controlled permissions

A share link is associated with a specific file and can only be accessed by authorized users.

Contributing

Contributions are welcome.

To contribute:

Fork the repository.

Create a new branch:

git checkout -b feature/your-feature

Make your changes.

Test the changes locally.

Commit your changes:

git add .
git commit -m "Describe your change"

Push the branch:

git push origin feature/your-feature

Create a pull request.

Please make sure contributions do not contain:

Passwords or credentials

.env files

Virtual environments

node_modules

Generated application data

User-uploaded files

License

This project is currently not associated with a specific open-source license.

If a license is added in the future, the license information will be documented here.

Contact

For questions, suggestions, or support regarding the project, please contact:

Email: dhruvarajdrks18@gmail.com