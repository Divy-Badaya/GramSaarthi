# GRAMSAARTHI Backend

FastAPI + MySQL backend for the GRAMSAARTHI rural entrepreneur support platform.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | FastAPI 0.115 |
| Server | Uvicorn |
| ORM | SQLAlchemy 2.x |
| Database | MySQL |
| Driver | PyMySQL |
| Validation | Pydantic v2 |
| Config | pydantic-settings |

## Prerequisites

- Python 3.11+
- MySQL 8.x running locally
- The `gramsaarthi` database must be created in MySQL

## Quick Start

### 1. Create MySQL Database

Open MySQL and run:

```sql
CREATE DATABASE IF NOT EXISTS gramsaarthi CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Set up environment

```bash
cd backend
copy .env.example .env
```

Edit `.env` and set your MySQL credentials:

```
DATABASE_URL=mysql+pymysql://root:YOUR_PASSWORD@localhost:3306/gramsaarthi
FRONTEND_ORIGIN=http://localhost:5173
```

### 3. Install Python dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 4. Start the server

```bash
cd backend
uvicorn app.main:app --reload
```

The server starts on `http://localhost:8000`.

Tables are created and demo data is seeded automatically on first start.

### 5. Verify

```bash
curl http://localhost:8000/api/health
```

Expected response:
```json
{"status": "ok", "service": "GRAMSAARTHI API"}
```

### 6. Open API docs

Visit: http://localhost:8000/api/docs

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/user/profile` | Get demo user profile |
| PUT | `/api/user/profile` | Update demo user profile |
| GET | `/api/user/activity` | Recent activity history |
| POST | `/api/recommend` | Get business recommendation |
| GET | `/api/recommend/ideas` | List business ideas |
| GET | `/api/schemes` | Get government schemes |
| POST | `/api/assessments` | Save completed assessment |
| POST | `/api/advisor/ask` | Ask the AI advisor |

## Frontend Integration

Set in the project root `.env`:

```
VITE_API_URL=http://localhost:8000
```

The frontend will automatically switch from mock data to the live API.

To revert to mock data, remove or comment out `VITE_API_URL`.

## Architecture

```
React Frontend (port 5173)
    │
    │  REST API (JSON)
    ▼
FastAPI Backend (port 8000)
    │
    │  SQLAlchemy ORM
    ▼
MySQL Database (port 3306)
    ├── users
    ├── businesses
    ├── schemes
    ├── assessments
    └── activities
```

## Key Assessment Flow

```
BusinessAssessment.jsx
    │
    │  POST /api/assessments
    ▼
assessment saved to MySQL
    │
    │  POST /api/recommend
    ▼
rule-based recommendation engine
    │
    │  RecommendResponse (matches DEMO_ASSESSMENT shape)
    ▼
BusinessAnalysis.jsx renders result
```

## Future Phases

- **Phase 2:** JWT authentication, user registration/login
- **Phase 3:** ML model (XGBoost) for recommendations
- **Phase 4:** LLM (Gemini) for AI advisor
- **Phase 5:** Real government scheme scraping
- **Phase 6:** Speech-to-text, translation

## Database Manual Seed

If automatic seeding fails, run manually:

```bash
cd backend
python -m app.database.init_db
```

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | MySQL connection string | `mysql+pymysql://root:password@localhost:3306/gramsaarthi` |
| `FRONTEND_ORIGIN` | Allowed CORS origin | `http://localhost:5173` |
