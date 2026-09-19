# 🌱 GRAMSAARTHI

### AI-Powered Rural Business Guidance Platform

GRAMSAARTHI is an AI-powered platform designed to help small and aspiring rural entrepreneurs make better business decisions through personalized business recommendations, AI-powered guidance, government scheme information, business assessment, and business planning support.

---

## About GRAMSAARTHI

GRAMSAARTHI is an AI-powered rural business guidance platform designed to help small and aspiring rural entrepreneurs make better business decisions.

The platform combines Machine Learning, Generative AI, business assessment, government scheme information, and multilingual support to provide personalized and practical guidance based on a user's requirements and local context.

Instead of requiring users to search through multiple sources for business opportunities, government schemes, financial guidance, and business planning information, GRAMSAARTHI brings these capabilities together into a single platform.

---

## Problem Statement

Rural and small entrepreneurs often face difficulties when starting or expanding a business because of limited access to:

- Reliable business guidance
- Information about suitable business opportunities
- Local market and business insights
- Government schemes and support programs
- Financial and business planning assistance
- Technical and digital resources
- Personalized recommendations
- Information in regional languages

Finding and understanding this information often requires using multiple platforms and sources.

GRAMSAARTHI aims to address this gap by bringing business assessment, recommendations, AI assistance, government scheme information, and business planning support together in one platform.

---

## Our Solution

GRAMSAARTHI provides an integrated platform that guides users through the business decision-making process.

The platform:

1. Collects information about the user's requirements and business context.
2. Assesses the user's business readiness.
3. Uses business and local-context data for recommendations.
4. Uses a Machine Learning model as part of the recommendation pipeline.
5. Provides an AI-powered advisor using Google Gemini.
6. Provides information about relevant government schemes.
7. Supports business planning and DPR generation.
8. Provides document-related assistance.
9. Supports multiple languages for better accessibility.

The goal is to make business guidance easier to access and understand for rural and small entrepreneurs.

---

## Purpose

The main purpose of GRAMSAARTHI is to make business guidance more accessible to rural and small entrepreneurs by providing:

- Personalized business recommendations
- AI-powered business guidance
- Business readiness assessment
- Government scheme information
- Business planning support
- Document-related assistance
- Multilingual accessibility
- Local business and market-related insights

The platform is designed with simplicity and accessibility in mind so that users with limited technical knowledge can use it easily.

---

## Key Features

### 🤖 AI Business Advisor

An AI-powered advisor allows users to ask questions about:

- Business opportunities
- Business planning
- Finance
- Government schemes
- Business growth
- Entrepreneurship-related queries

The backend integrates the Google Gemini API to provide contextual responses.

---

### 📊 ML-Based Business Recommendation

GRAMSAARTHI uses a trained Machine Learning model as part of its business recommendation pipeline.

The recommendation system uses assessment information and available business-related data to help identify suitable business opportunities for the user.

---

### 📝 Business Assessment

Users can provide information about their:

- Location
- Available capital
- Business interests
- Skills and resources
- Loan requirements
- Other business requirements

This information is used as context for generating personalized recommendations.

---

### 🏛️ Government Schemes

The platform provides information about government schemes that may be relevant to entrepreneurs and small businesses.

Users can explore schemes and use the AI Advisor to understand them in a simpler way.

---

### 📄 DPR & Business Planning

GRAMSAARTHI provides business planning support, including assistance with preparing a Detailed Project Report (DPR) and organizing important business information.

---

### 📑 Document Assistance

Users can upload relevant business documents through the platform and use the document-related functionality provided by the system.

---

### 🌐 Multilingual Support

The platform supports multiple languages to improve accessibility:

- English
- Hindi
- Gujarati

---

### 🎤 Speech Interaction

Speech-to-text functionality allows users to interact with the platform using voice input, reducing the dependency on typing.

---

### 🏪 Business Comparison

Users can compare business-related information to better understand different business opportunities and local competition.

---

## AI & Machine Learning

GRAMSAARTHI combines Machine Learning and Generative AI to provide business recommendations and personalized guidance.

## Machine Learning

The project includes a trained business recommendation model:

```text
backend/ml/gramsaarthi_business_model.pkl
```

The backend recommendation service loads the model and uses it as part of the business recommendation pipeline.

The model works together with application-level business logic and assessment information to generate recommendations.

## Generative AI

Google Gemini is integrated into the AI Advisor to provide contextual responses to user queries.

The general AI flow is:

```
User Question
      │
      ▼
FastAPI AI Advisor Service
      │
      ▼
ML Recommendation Model
      │
      ▼
Personalized Recommendation
      │
      ▼
Google Gemini API (LLM)
      │
      ▼
Personalized AI Response
      │
      ▼
React Frontend
```

## How the Backend Supports the Platform

The FastAPI backend acts as the central layer connecting the frontend with the database, Machine Learning model, and AI services.

```
User
  │
  ▼
React Frontend
  │
  │ REST API
  ▼
FastAPI Backend
  │
  ├──► MySQL Database
  │
  ├──► ML Recommendation Model
  │
  └──► Gemini + ML Model AI Advisor
```
The backend manages API requests, database operations, business assessments, recommendations, government scheme data, AI interactions, authentication, and other application services.


## Tech Stack
| Layer            | Technology        |
| ---------------- | ----------------- |
| Frontend         | React + Vite      |
| Backend          | FastAPI           |
| Server           | Uvicorn           |
| ORM              | SQLAlchemy 2.x    |
| Database         | MySQL             |
| Driver           | PyMySQL           |
| Validation       | Pydantic v2       |
| Configuration    | pydantic-settings |
| AI Advisor       | Google Gemini API |
| Machine Learning | Python ML Model   |

## System Architecture
```
React Frontend
    │
    │ REST API (JSON)
    ▼
FastAPI Backend
    │
    ├── SQLAlchemy ORM
    │
    ├── Business Recommendation Service
    │       │
    │       └── ML Model
    │
    ├── Gemini + ML Model AI Advisor
    │
    └── MySQL Database
            ├── users
            ├── businesses
            ├── schemes
            ├── assessments
            └── activities
```

## Application Flow
```
User
 │
 ▼
Registration / Login
 │
 ▼
Business Assessment
 │
 ├── Location
 ├── Capital
 ├── Skills & Resources
 └── Business Requirements
 │
 ▼
Recommendation Engine
 │
 ▼
ML / Business Recommendation
 │
 ▼
Business Analysis
 │
 ├──────────────► Government Schemes
 │
 ├──────────────► AI Advisor
 │
 ├──────────────► DPR / Business Planning
 │
 └──────────────► Business Comparison
```

## Key Assessment Flow
```
Business Assessment
    │
    │ POST /api/assessments
    ▼
Assessment saved to MySQL
    │
    │ Recommendation request
    ▼
Recommendation Service
    │
    ├── Assessment Context
    ├── Business / Local Data
    └── ML Model
    │
    ▼
Business Recommendation
    │
    ▼
Frontend Business Analysis
```

## AI Advisor Flow
```
User Input & Assessment
          │
          ▼
    FastAPI Backend
          │
          ▼
   ┌───────────────────┐
   │ ML Recommendation │
   │      Model        │
   └───────────────────┘
          │
          ▼
Personalized Recommendation
          │
          ├── User Profile
          ├── Assessment Data
          └── ML Prediction
          │
          ▼
   Google Gemini LLM
          │
          ▼
Context-Aware Personalized
       AI Guidance
          │
          ▼
    React Frontend
```

## Frontend AI Advisor

The AI Advisor is designed to provide contextual guidance related to business planning, opportunities, government schemes, finance, and other entrepreneurship-related queries.

## Project Structure
```
GRAMSAARTHI/
│
├── frontend/
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── ...
│
├── backend/
│   ├── app/
│   │   ├── database/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── config.py
│   │   └── main.py
│   │
│   ├── ml/
│   │   └── gramsaarthi_business_model.pkl
│   │
│   ├── tests/
│   ├── requirements.txt
│   └── .env.example
│
├── dist/
├── .gitignore
└── README.md
```



## 📸 Screenshots
### Dashboard
<img width="1917" height="867" alt="Screenshot 2026-09-18 192613" src="https://github.com/user-attachments/assets/4ad59aa9-6849-46c2-b387-138903084698" />

### AI Advisor
<img width="1917" height="870" alt="Screenshot 2026-09-18 192458" src="https://github.com/user-attachments/assets/ffc3a040-2bf2-4598-92e0-77713f35acf1" />

### Business Analysis
<img width="1917" height="867" alt="Screenshot 2026-09-18 191750" src="https://github.com/user-attachments/assets/c03255aa-5122-499f-b165-04dda136fbf5" />


## Team / Contributors

GRAMSAARTHI was developed as a collaborative project.

| Contributor   | GitHub                                           |
| ------------- | ------------------------------------------------ |
| Divy Badaya     | [@Divy-Badaya](https://github.com/Divy-Badaya) |
| Khushi Sultania | [@khushisultaniya911-lgtm](https://github.com/khushisultaniya911-lgtm)         |
| Tejas Tibrewal | [@tejasxtibrewal](https://github.com/tejasxtibrewal)         |
| Siddhant Kumar | [@siddhantkr4973-spec](https://github.com/siddhantkr4973-spec)         |
| Akshat Khandelwal | @akshat         |
| Vasu Deep Kohli | @Vasu         |

## Quick Start

Want to run GRAMSAARTHI locally?

👉 [Read the Quick Start Guide](https://github.com/Divy-Badaya/GramSaarthi/blob/main/QuickStart.md)
