from fastapi import APIRouter
from app.api.v1.routes import auth, patients, analyze, admin, dev

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(patients.router)
api_router.include_router(analyze.router)
api_router.include_router(admin.router)
api_router.include_router(dev.router)
