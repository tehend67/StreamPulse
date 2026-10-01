from fastapi import APIRouter
from app.api.v1 import auth, integrations, actions, dashboard, users

router = APIRouter(prefix="/api/v1")
router.include_router(auth.router)
router.include_router(integrations.router)
router.include_router(actions.router)
router.include_router(dashboard.router)
router.include_router(users.router)
