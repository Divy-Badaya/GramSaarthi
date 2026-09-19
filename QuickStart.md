# GRAMSAARTHI — Quick Start Guide

This guide explains how to set up and run GRAMSAARTHI on a new computer for local development.

---

## Prerequisites

Make sure the following are installed:

- Python 3.11+
- Node.js 18+
- npm
- MySQL 8.x
- Git
- Google Gemini API key

Verify the installations:

```bash
python --version
node --version
npm --version
git --version
```

### 1. Clone the Repository

Open a terminal and run:
```bash
git clone https://github.com/YOUR_USERNAME/GRAMSAARTHI.git
```
Then enter the project directory:
```
cd GRAMSAARTHI
```

### 2. Create MySQL Database

Open MySQL and run:

```sql
CREATE DATABASE IF NOT EXISTS gramsaarthi CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```
Make sure MySQL Server is running before starting the backend.

### 3. Set up environment

```bash
cd backend
copy .env.example .env
```

Edit `.env` and configure your local credentials and API keys.

```
DATABASE_URL=mysql+pymysql://root:YOUR_PASSWORD@localhost:3306/gramsaarthi
FRONTEND_ORIGIN=http://localhost:5173
JWT_SECRET_KEY=YOUR_JWT_SECRET
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

### 4. Install Python dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 5. Start the server

```bash
cd backend
uvicorn app.main:app --reload --port 8001
```

The server starts on `http://localhost:8001`.

### 6. Verify

```bash
curl http://localhost:8001/api/health
```

Expected response:
```json
{"status": "ok", "service": "GRAMSAARTHI API"}
```

### 7. Frontend Setup

Open a new terminal while keeping the backend running.

From the project root:

```
cd frontend
```

Install frontend dependencies:
```
npm install
```

### 8. Configure Frontend Environment

Create a .env file in the frontend directory.
```
VITE_API_URL=http://localhost:8001
```

### 9. Start the Frontend

Run:
```Bash
npm run dev
```

Vite will display the local URL in the terminal, usually similar to: `http://localhost:5173`

Open that URL in your browser.

### 10. Run the Complete Application

You should have two terminals running.

Terminal 1 — Backend
```
cd backend
uvicorn app.main:app --reload --port 8001
```
Terminal 2 — Frontend
```
cd frontend
npm run dev
```

Then open the frontend URL shown by Vite.

## Open API docs

Visit: `http://localhost:8001/api/docs`

### API Endpoints

| Method | Path                   | Description                        |
| ------ | ---------------------- | ---------------------------------- |
| GET    | `/api/health`          | Health check                       |
| GET    | `/api/user/profile`    | Get user profile                   |
| PUT    | `/api/user/profile`    | Update user profile                |
| GET    | `/api/user/activity`   | Get recent activity history        |
| POST   | `/api/recommend`       | Generate business recommendation   |
| GET    | `/api/recommend/ideas` | Get available business ideas       |
| GET    | `/api/schemes`         | Get government schemes             |
| POST   | `/api/assessments`     | Save completed business assessment |
| POST   | `/api/advisor/ask`     | Ask the AI Advisor                 |

Additional endpoints may be available depending on the enabled application modules.


## Database Manual Seed

If automatic seeding fails, run manually:

```bash
cd backend
python -m app.database.init_db
```

## Environment Variables

| Variable          | Description                        | Example                                                         |
| ----------------- | ---------------------------------- | --------------------------------------------------------------- |
| `DATABASE_URL`    | MySQL connection string            | `mysql+pymysql://root:YOUR_PASSWORD@localhost:3306/gramsaarthi` |
| `FRONTEND_ORIGIN` | Allowed frontend CORS origin       | `http://localhost:5173`                                         |
| `JWT_SECRET_KEY`  | Secret used for JWT authentication | `YOUR_JWT_SECRET`                                               |
| `GEMINI_API_KEY`  | Google Gemini API key              | `YOUR_GEMINI_API_KEY`                                           |

### More Information

For an overview of the project, features, architecture, AI/ML implementation, contributors, and future improvements, see:

👉 README.md

