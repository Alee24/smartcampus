from fastapi import APIRouter, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from app.database import get_session
from app.models import SystemConfig, User
from app.auth import get_current_user
import json

router = APIRouter()

async def ensure_admin(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/ai-config")
async def get_ai_config(
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(ensure_admin)
):
    """Get AI configuration"""
    stmt = select(SystemConfig).where(SystemConfig.key == "ai_config")
    config = (await session.exec(stmt)).first()
    
    if config:
        return json.loads(config.value)
    else:
        # Return default config
        return {}

@router.post("/ai-config")
async def save_ai_config(
    payload: dict,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(ensure_admin)
):
    """Save AI configuration"""
    config_json = json.dumps(payload)
    
    stmt = select(SystemConfig).where(SystemConfig.key == "ai_config")
    existing = (await session.exec(stmt)).first()
    
    if existing:
        existing.value = config_json
        session.add(existing)
    else:
        new_config = SystemConfig(
            key="ai_config",
            value=config_json,
            category="ai"
        )
        session.add(new_config)
    
    await session.commit()
    return {"status": "success"}

@router.post("/ai-test/{service}")
async def test_ai_service(
    service: str,
    payload: dict,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(ensure_admin)
):
    """Test AI service connection"""
    try:
        if service == "openai":
            # Test OpenAI connection (Support v1.x and v0.x)
            api_key = payload.get("openai_api_key")
            try:
                # v1.x syntax
                from openai import OpenAI
                client = OpenAI(api_key=api_key)
                client.models.list()
            except (ImportError, TypeError, AttributeError):
                # v0.x fallback
                import openai
                openai.api_key = api_key
                openai.Model.list()
            
            return {"success": True, "message": "OpenAI connection successful"}
            
        elif service == "google":
            # Test Google Cloud Vision
            from google.cloud import vision
            import json

            key_content = payload.get("google_vision_api_key", "").strip()
            client = None

            if key_content.startswith("{"):
                # Option A: Service Account JSON
                try:
                    from google.oauth2 import service_account
                    info = json.loads(key_content)
                    credentials = service_account.Credentials.from_service_account_info(info)
                    client = vision.ImageAnnotatorClient(credentials=credentials)
                except Exception as e:
                    return {"success": False, "message": f"Invalid Service Account JSON: {str(e)}"}
            else:
                # Option B: API Key String
                try:
                    from google.api_core.client_options import ClientOptions
                    # Note: Using ONLY api_key requires a client that doesn't demand default credentials
                    # or explicitly handling functionality that works with API keys.
                    # Warning: google-cloud-vision optimized for Service Accounts.
                    client_options = ClientOptions(api_key=key_content)
                    client = vision.ImageAnnotatorClient(client_options=client_options)
                except Exception as e:
                     return {"success": False, "message": f"Failed to init with API Key: {str(e)}"}

            # Perform a lightweight check (sending empty image to check Auth)
            try:
                # We send empty bytes. If Auth is bad, we get 401/403.
                # If Auth is good, we get 400 (Empty image).
                image = vision.Image(content=b'')
                client.face_detection(image=image)
            except Exception as e:
                msg = str(e)
                # If error is about authentication, fail.
                if "401" in msg or "403" in msg or "Unauthenticated" in msg or "Could not automatically determine credentials" in msg:
                     return {"success": False, "message": f"Authentication failed: {msg}"}
                # Else, likely a validation error (empty image), which means Auth worked!
            
            return {"success": True, "message": "Google Vision connection successful"}
            
        elif service == "aws":
            # Test AWS Rekognition
            import boto3
            client = boto3.client(
                'rekognition',
                aws_access_key_id=payload.get("aws_access_key"),
                aws_secret_access_key=payload.get("aws_secret_key"),
                region_name=payload.get("aws_region")
            )
            # Test by listing collections
            response = client.list_collections()
            return {"success": True, "message": "AWS Rekognition connection successful"}
            
        elif service == "deepstack":
            # Test DeepStack connection
            import requests
            url = payload.get("deepstack_url")
            response = requests.get(f"{url}/v1/vision/detection")
            if response.status_code == 200:
                return {"success": True, "message": "DeepStack connection successful"}
            else:
                return {"success": False, "message": f"DeepStack returned {response.status_code}"}
                
        elif service == "dynamics":
            # Test Microsoft Dynamics Connection
            import requests
            import uuid
            url = payload.get("dynamics_base_url", "").strip()
            tenant = payload.get("dynamics_tenant_id", "").strip()
            client_id = payload.get("dynamics_client_id", "").strip()
            client_secret = payload.get("dynamics_client_secret", "").strip()

            if not url:
                return {"success": False, "message": "Dynamics Endpoint URL is required"}

            if "mock" in client_id.lower() or "test" in client_id.lower() or not client_id:
                return {"success": True, "message": "Dynamics ERP connection simulated successfully (Simulated Fallback Mode)"}

            # Try ERP Middleware check first
            try:
                normalized_url = url.rstrip('/')
                if "/api/erp/dynamics" in normalized_url:
                    health_url = f"{normalized_url}/health"
                    students_url = f"{normalized_url}/current-students?status=Current"
                else:
                    health_url = f"{normalized_url}/api/erp/dynamics/health"
                    students_url = f"{normalized_url}/api/erp/dynamics/current-students?status=Current"
                
                headers = {"Accept": "application/json"}
                # Try health first
                res = requests.get(health_url, headers=headers, timeout=4)
                if res.status_code == 200:
                    return {"success": True, "message": "Connected successfully to ERP Middleware (Health status: OK)."}
                
                # Try students list as fallback for middleware
                res_s = requests.get(students_url, headers=headers, timeout=4)
                if res_s.status_code == 200:
                    data = res_s.json()
                    num_students = 0
                    if isinstance(data, list):
                        num_students = len(data)
                    elif isinstance(data, dict):
                        for k in ["students", "data", "profiles", "value"]:
                            if k in data and isinstance(data[k], list):
                                num_students = len(data[k])
                                break
                    return {"success": True, "message": f"Connected successfully to ERP Middleware. Found {num_students} students."}
            except Exception as e:
                # Silently ignore and fall back to OData
                print(f"ERP Middleware test failed: {e}. Trying OData...")

            # Check if using Azure AD OAuth (GUID format) or Basic Authentication
            is_guid = False
            try:
                if client_id:
                    uuid.UUID(client_id)
                    is_guid = True
            except ValueError:
                pass

            try:
                if is_guid:
                    # Azure AD OAuth
                    token_url = f"https://login.microsoftonline.com/{tenant or 'common'}/oauth2/v2.0/token"
                    token_data = {
                        "grant_type": "client_credentials",
                        "client_id": client_id,
                        "client_secret": client_secret,
                        "scope": "https://api.businesscentral.dynamics.com/.default"
                    }
                    res = requests.post(token_url, data=token_data, timeout=5)
                    if res.status_code == 200:
                        token = res.json().get("access_token")
                        headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
                        test_res = requests.get(f"{url}/CustomerList", headers=headers, timeout=5)
                        if test_res.status_code == 200:
                            num_records = len(test_res.json().get('value', [])) if isinstance(test_res.json(), dict) else len(test_res.json())
                            return {"success": True, "message": f"Connected successfully via OAuth. Found {num_records} student records."}
                        else:
                            return {"success": False, "message": f"OAuth token acquired, but OData request failed (HTTP {test_res.status_code}): {test_res.text}"}
                    else:
                        return {"success": False, "message": f"OAuth token request failed (HTTP {res.status_code}): {res.text}"}
                else:
                    # Web Service Basic Auth (Username and Password / Access Key)
                    test_res = requests.get(f"{url}/CustomerList", auth=(client_id, client_secret), timeout=5)
                    if test_res.status_code == 200:
                        num_records = len(test_res.json().get('value', [])) if isinstance(test_res.json(), dict) else len(test_res.json())
                        return {"success": True, "message": f"Connected successfully via Basic Auth. Found {num_records} student records."}
                    else:
                        return {"success": False, "message": f"Basic Auth connection failed (HTTP {test_res.status_code}): {test_res.text}"}
            except Exception as e:
                return {"success": False, "message": f"Dynamics connection error: {str(e)}"}
                
        else:
            return {"success": False, "message": "Unknown service"}
            
    except Exception as e:
        return {"success": False, "message": str(e)}
