bash setup.sh                          # 1. crée tout le projet
cd master-commerce
# 2. corrigez les 5 typos ci-dessus (ou laissez l'agent le faire)
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload          # → http://localhost:8000/docs
cd ../frontend && npm install && npm run dev   # → http://localhost:3000
