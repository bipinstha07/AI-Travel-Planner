# AI Travel Planner

AI Travel Planner is a full‑stack project that helps users design, plan, and view trip itineraries using AI-driven agents. The project includes a TypeScript frontend (Vite + React/TS) and a Python backend (agents & router).

---

# Screenshots
<img width="1882" height="955" alt="Screenshot 2025-11-23 at 7 33 24 PM" src="https://github.com/user-attachments/assets/f278b091-2f1b-4b0a-81e0-a2261546ed09" />
<img width="1530" height="866" alt="Screenshot 2025-11-23 at 7 33 36 PM" src="https://github.com/user-attachments/assets/724aadaf-cafe-436b-a29c-b8857666b7f1" />
<img width="1895" height="941" alt="Screenshot 2025-11-23 at 7 32 47 PM" src="https://github.com/user-attachments/assets/7ecc18dd-dbf0-4e46-b440-5091282e8091" />


## Table of contents

- [Repository structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Quick install & run (local dev)](#quick-install--run-local-dev)
  - [Backend (Python)](#backend-python)
  - [Frontend (TypeScript)](#frontend-typescript)
- [Environment variables](#environment-variables)
- [Build & deploy (notes)](#build--deploy-notes)
- [Development tips](#development-tips)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License & contact](#license--contact)

---

## Repository structure

Below is the repository tree (as provided). This shows top-level folders and key files:
```
.
├── .DS_Store  
├── .gitignore  
├── .idea/  
│   ├── inspectionProfiles/  
│   │   └── Project_Default.xml  
│   ├── .gitignore  
│   ├── AI Travel Planner.iml  
│   ├── misc.xml  
│   ├── modules.xml  
│   └── vcs.xml  
├── AI-Travel-Planner-Backend/  
│   ├── app/  
│   │   ├── agents/  
│   │   │   ├── Itinerary_Data/  
│   │   │   │   ├── Airport_helper.py  
│   │   │   │   ├── Flight.py  
│   │   │   │   ├── Hotels.py  
│   │   │   │   └── Maps.py  
│   │   │   ├── _init_.py  
│   │   │   ├── chat_agent.py  
│   │   │   ├── itinerary_agent2.py  
│   │   │   └── state.py  
│   │   ├── router/  
│   │   │   ├── _init_.py  
│   │   │   ├── chatbot.py  
│   │   │   └── test.py  
│   │   ├── _init_.py  
│   │   └── main.py  
│   └── requirement.txt  
├── AI-Travel-Planner-Frontend/  
│   ├── public/  
│   │   └── logo.png  
│   ├── src/  
│   │   ├── component/  
│   │   │   ├── background/  
│   │   │   │   └── LiveBackground.tsx  
│   │   │   ├── chat/  
│   │   │   │   └── TripDesigner.tsx  
│   │   │   ├── itinerary/  
│   │   │   │   └── ItineraryView.tsx  
│   │   │   ├── landing/  
│   │   │   │   ├── FAQ.tsx  
│   │   │   │   ├── HowItWorks.tsx  
│   │   │   │   └── Pricing.tsx  
│   │   │   └── smaller-component/  
│   │   │       └── PlanDestination.tsx  
│   │   ├── footer/  
│   │   │   └── Footer.tsx  
│   │   ├── header/  
│   │   │   └── Header.tsx  
│   │   ├── pages/  
│   │   │   ├── ChatPage.tsx  
│   │   │   ├── FlightPage.tsx  
│   │   │   └── LandingPage.tsx  
│   │   ├── test/  
│   │   │   └── TestPage.tsx  
│   │   ├── types/  
│   │   │   └── trave.ts  
│   │   ├── utils/  
│   │   │   └── dateUtils.ts  
│   │   ├── App.tsx  
│   │   ├── index.css  
│   │   └── main.tsx  
│   ├── .gitignore  
│   ├── eslint.config.js  
│   ├── index.html  
│   ├── package-lock.json  
│   ├── package.json  
│   ├── postcss.config.js  
│   ├── README.md  
│   ├── tailwind.config.js  
│   ├── tsconfig.app.json  
│   ├── tsconfig.json  
│   ├── tsconfig.node.json  
│   ├── vite.config.ts  
│   └── yarn.lock  
├── package-lock.json  
└── README.md
```


Notes:
- Backend entrypoint candidate: AI-Travel-Planner-Backend/app/main.py
- Frontend is a TypeScript (Vite + React) project (presence of vite.config.ts and package.json)
- Python dependencies listed in AI-Travel-Planner-Backend/requirement.txt

---

## Prerequisites

Install the following before starting:

- Git
- Node.js (recommended v16+ or v18+)
- npm (comes with Node) or Yarn
- Python 3.8+
- pip
- (Optional) virtualenv / venv for Python isolation
- API keys you plan to use (e.g., HuggingFace, Gemini, SerpAPI) — see Environment variables

---

## Quick install & run (local dev)

Open two terminals (one for backend, one for frontend).

### Backend (Python)

1. Change to backend folder:
   ```bash
   cd AI-Travel-Planner-Backend
   ```

2. Create & activate a virtual environment:
   - macOS / Linux:
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```
   - Windows (PowerShell):
     ```powershell
     python -m venv .venv
     .\.venv\Scripts\Activate.ps1
     ```
   - Windows (cmd):
     ```cmd
     python -m venv .venv
     .\.venv\Scripts\activate
     ```

3. Install dependencies:
   ```bash
   pip install -r requirement.txt
   ```

4. Configure environment variables (see [Environment variables](#environment-variables)).

5. Run the backend:
   - If it's FastAPI (common with uvicorn):
     ```bash
     uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
     ```
   - If it's Flask:
     ```bash
     export FLASK_APP=app.main
     export FLASK_ENV=development
     flask run --host=0.0.0.0 --port=5000
     ```
   - If neither command works, open `AI-Travel-Planner-Backend/app/main.py` and follow its run instructions or run it directly:
     ```bash
     python -m AI-Travel-Planner-Backend.app.main
     ```

6. Confirm the backend is reachable:
   - FastAPI default: http://localhost:8000/docs or http://localhost:8000
   - Flask default: http://localhost:5000

### Frontend (TypeScript / Vite)

1. Change to frontend folder:
   ```bash
   cd AI-Travel-Planner-Frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Provide frontend environment variables (if any). Vite uses VITE_* prefixed vars. Example: `VITE_API_BASE_URL`.

4. Start dev server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open the frontend (Vite default):
   - http://localhost:5173

6. Ensure the frontend API base URL points to the running backend (update `.env` or configuration code to match `http://localhost:8000` or `http://localhost:5000` depending on backend).

---

## Environment variables

Create `.env` files (do not commit secrets).

Backend (.env example):
```env
HF_TOKEN=your_huggingface_token
SERP_API_KEY=your_serp_api_key
PORT=8000
CORS_ORIGINS=http://localhost:5173
```

Frontend (.env example):
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_GEMINI_API_KEY=your_gemini_key
```

Notes:
- Prefix frontend variables with `VITE_` for Vite to expose them to client code.
- Keep secrets out of version control. Use CI/CD secret stores for production deployments.

---

## Build & deploy (notes)

Frontend:
- Build:
  ```bash
  npm run build
  # or
  yarn build
  ```
- Deploy static output (dist/) to Netlify, Vercel, S3, or serve via a Node server.

Backend:
- Containerize (Docker) or deploy to Heroku, Render, AWS ECS/Fargate, or similar.
- Ensure environment variables and CORS are correctly configured for the deployed frontend origin.

---

## Development tips

- Use `uvicorn --reload` (FastAPI) or Flask debug mode for backend hot reload.
- Use Vite dev server for frontend hot module replacement.
- Keep Python virtualenv and Node dependencies isolated per folder.
- Format Python with `black` and lint TypeScript with configured ESLint/Prettier.
- Add CI workflows (GitHub Actions) to run lint/test for frontend and backend.

---

## Troubleshooting

- "Cannot import app" / "ModuleNotFoundError":
  - Ensure you run `uvicorn` from the `AI-Travel-Planner-Backend` directory and use the app module path relative to it, e.g., `uvicorn app.main:app`.
  - Confirm Python path / virtualenv activated.

- Frontend cannot reach backend:
  - Check backend CORS settings.
  - Confirm `VITE_API_BASE_URL` is set and used by frontend API code.

- Dependency mismatch:
  - Remove `node_modules` and reinstall frontend deps.
  - Recreate Python virtualenv and reinstall `pip install -r requirement.txt`.

---

## Contributing

1. Fork repository
2. Create a feature branch:
   ```bash
   git checkout -b feat/your-feature
   ```
3. Commit changes and push
4. Open a pull request describing changes

Guidelines:
- Follow TypeScript lint rules and format Python code with `black`.
- Add tests when applicable and update README with any infra/usage changes.

---

## License & contact

This project is licensed under the MIT License — see the [LICENSE](./LICENSE) file for details.

Maintained by **bipinstha07**. For questions or suggestions, open an issue in this repository.

---
