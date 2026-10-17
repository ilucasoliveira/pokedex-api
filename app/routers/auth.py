from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User
from app.schemas import ErrorResponse, Token, UserCreate, UserResponse
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    status_code=201,
    response_model=UserResponse,
    summary="Register a user",
    description=(
        "Creates a new user. Registration is open. The username is stored in "
        "lowercase and the password is stored only as a bcrypt hash."
    ),
    responses={
        409: {"model": ErrorResponse, "description": "Username already exists."}
    },
)
async def register(user: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == user.username))
    if result.scalars().first():
        raise HTTPException(status_code=409, detail="Username already exists.")

    new_user = User(
        username=user.username, hashed_password=hash_password(user.password)
    )
    db.add(new_user)
    await db.commit()

    return new_user


@router.post(
    "/token",
    response_model=Token,
    summary="Log in and get an access token",
    description=(
        "Receives `username` and `password` as **form data** (OAuth2 password flow), "
        "not JSON. Returns a JWT valid for the configured number of minutes "
        "(30 by default). Send it in the `Authorization: Bearer <token>` header, "
        "or use the **Authorize** button at the top of this page."
    ),
    responses={
        401: {"model": ErrorResponse, "description": "Incorrect username or password."}
    },
)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(User.username == form_data.username.lower())
    )
    user = result.scalars().first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return Token(access_token=create_access_token(user.username))
