from datetime import datetime, timedelta
from typing import Optional, Union
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from app.database import get_session
from app.models import User

# Configuration
SECRET_KEY = "supersecretkey" # Change in production
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 30 # 30 Days (Persistent Login)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/token")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), session: AsyncSession = Depends(get_session)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # Check by email or admission_number
    statement = select(User).where((User.email == username) | (User.admission_number == username))
    result = await session.exec(statement)
    user = result.first()
    
    if user is None:
        raise credentials_exception
    return user

# --- LDAP & Google Integration ---
from ldap3 import Server, Connection, ALL, SUBTREE
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from app.models import SystemConfig

async def verify_ldap_login(username, password, session: AsyncSession):
    # Fetch configs
    configs = (await session.exec(select(SystemConfig))).all()
    config_dict = {c.key: c.value for c in configs}
    
    server_uri = config_dict.get('ldap_server_uri')
    bind_dn = config_dict.get('ldap_bind_dn') # e.g., cn=admin,dc=example,dc=com or user@domain.com
    bind_password = config_dict.get('ldap_bind_password')
    base_dn = config_dict.get('ldap_base_dn')
    
    if not server_uri or not base_dn:
        print("LDAP Config missing")
        return False
        
    try:
        # 1. Bind with service account or direct bind
        server = Server(server_uri, get_info=ALL)
        
        # Simple bind check: often we need to find the user DN first unless we construct it
        # Try finding user first using admin creds
        conn = Connection(server, user=bind_dn, password=bind_password, auto_bind=True)
        
        search_filter = f'(|(uid={username})(mail={username})(sAMAccountName={username}))'
        conn.search(base_dn, search_filter, attributes=['dn', 'mail', 'cn', 'givenName'])
        
        if not conn.entries:
            return False
            
        user_dn = conn.entries[0].entry_dn
        user_email = str(conn.entries[0].mail)
        user_name = str(conn.entries[0].cn)
        
        # 2. Re-bind with user credentials to verify password
        user_conn = Connection(server, user=user_dn, password=password)
        if not user_conn.bind():
            return False
            
        return {"email": user_email, "name": user_name, "dn": user_dn}
        
    except Exception as e:
        print(f"LDAP Error: {e}")
        return False

async def verify_google_token(token: str, session: AsyncSession):
    configs = (await session.exec(select(SystemConfig))).all()
    config_dict = {c.key: c.value for c in configs}
    client_id = config_dict.get('google_client_id')
    
    if not client_id:
        raise Exception("Google Client ID not configured")
        
    try:
        idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), client_id)
        return idinfo # Contains 'email', 'name', 'sub', etc.
    except ValueError as e:
        print(f"Google Token Error: {e}")
        return None
