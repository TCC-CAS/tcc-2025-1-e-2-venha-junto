from fastapi import FastAPI, Depends, HTTPException, status, Response, Request, UploadFile, File
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
import jwt
import os
import shutil
from dotenv import load_dotenv

import models
import schemas
from database import engine, get_db

# Carrega as variáveis de ambiente do arquivo .env
load_dotenv()


os.makedirs("avatars", exist_ok=True)

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Venha Junto API",
    description="API de Backend para o sistema de Turismo Acessível (TCC)",
    version="1.0.0"
)

# ---------------------------------------------
# CORS - PERMITIR QUE O FRONTEND ACESSE A API
# ---------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500", 
        "http://localhost:5500", 
        "http://127.0.0.1:5501", 
        "http://localhost:5501", 
        "http://127.0.0.1:5502", 
        "http://localhost:5502", 
        "http://127.0.0.1:8000",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://localhost:3000",
        "null"
    ], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------
# SEGURANÇA: SENHAS E TOKENS JWT
# ---------------------------------------------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# O getenv busca a chave secreta no arquivo .env
SECRET_KEY = os.getenv("SECRET_KEY", "venhajunto_secreta_tcc_2026_secur@123") 
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 7 dias logado

def get_password_hash(password: str):
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# ---------------------------------------------
# ROTAS DA API - USUÁRIOS
# ---------------------------------------------

@app.post("/api/usuarios/cadastro", response_model=schemas.UsuarioResponse, status_code=status.HTTP_201_CREATED)
def criar_usuario(usuario: schemas.UsuarioCreate, db: Session = Depends(get_db)):
    usuario_existente = db.query(models.Usuario).filter(models.Usuario.email == usuario.email).first()
    
    if usuario_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esse e-mail já está cadastrado em nosso sistema."
        )

    senha_segura = get_password_hash(usuario.senha)

    novo_usuario = models.Usuario(
        nome=usuario.nome,
        email=usuario.email.lower(),
        telefone=usuario.telefone,
        senha_hash=senha_segura
    )

    db.add(novo_usuario)
    db.commit()
    db.refresh(novo_usuario)

    return novo_usuario

# ---------------------------------------------
# ROTA DE LOGIN
# ---------------------------------------------
@app.post("/api/usuarios/login")
def login(usuario: schemas.UsuarioLogin, response: Response, db: Session = Depends(get_db)):
    db_user = db.query(models.Usuario).filter(models.Usuario.email == usuario.email.lower()).first()
    
    if not db_user or not verify_password(usuario.senha, db_user.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha inválidos."
        )
    
    # Criar o Token
    access_token = create_access_token(data={"sub": str(db_user.id)})
    
    # Salvar no navegador (segurança: Cookie HTTPOnly evita hackers JS de roubarem a sessão)
    response.set_cookie(
        key="vj_access_token",
        value=access_token,
        httponly=True,
        samesite="lax",
        secure=False, # HTTP local, depois em PROD muda p/ True (HTTPS)
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    
    return {"message": "Login realizado com sucesso", "nome": db_user.nome}

# ---------------------------------------------
# ROTA DE PERFIL DO USUÁRIO ("ME")
# ---------------------------------------------
@app.get("/api/usuarios/me", response_model=schemas.UsuarioResponse)
def ler_usuario_atual(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("vj_access_token")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autenticado")
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessão inválida")
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessão expirou ou é inválida")
        
    db_user = db.query(models.Usuario).filter(models.Usuario.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário não encontrado")
        
    return db_user

@app.put("/api/usuarios/me", response_model=schemas.UsuarioResponse)
def atualizar_usuario_atual(usuario_update: schemas.UsuarioUpdate, request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("vj_access_token")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autenticado")
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessão inválida")
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessão expirou ou é inválida")
        
    db_user = db.query(models.Usuario).filter(models.Usuario.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário não encontrado")
        
    if usuario_update.nome is not None:
        db_user.nome = usuario_update.nome
    if usuario_update.telefone is not None:
        db_user.telefone = usuario_update.telefone
        
    db.commit()
    db.refresh(db_user)
    return db_user

@app.delete("/api/usuarios/me", status_code=status.HTTP_204_NO_CONTENT)
def excluir_usuario_atual(request: Request, response: Response, db: Session = Depends(get_db)):
    token = request.cookies.get("vj_access_token")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autenticado")
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessão inválida")
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessão expirou ou é inválida")
        
    db_user = db.query(models.Usuario).filter(models.Usuario.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário não encontrado")
        
    db.delete(db_user)
    db.commit()
    
    # Remove o cookie para deslogar da sessão excluída
    response.delete_cookie(key="vj_access_token", httponly=True, samesite="lax")
    return None

# ---------------------------------------------
# ROTAS DE AVATAR (UPLOAD, LEITURA E DELEÇÃO)
# ---------------------------------------------
@app.post("/api/usuarios/me/avatar")
def upload_avatar(request: Request, file: UploadFile = File(...), db: Session = Depends(get_db)):
    token = request.cookies.get("vj_access_token")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autenticado")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessão inválida")
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessão expirou ou é inválida")
    
    filename = f"usuario_{user_id}.jpg"
    filepath = os.path.join("avatars", filename)
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"message": "Avatar atualizado com sucesso", "filename": filename}

@app.get("/api/usuarios/me/avatar")
def get_avatar(request: Request):
    token = request.cookies.get("vj_access_token")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autenticado")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessão inválida")
        
    filepath = os.path.join("avatars", f"usuario_{user_id}.jpg")
    if not os.path.exists(filepath):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Avatar não encontrado")
        
    return FileResponse(filepath)

@app.delete("/api/usuarios/me/avatar")
def delete_avatar(request: Request):
    token = request.cookies.get("vj_access_token")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autenticado")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessão inválida")
        
    filepath = os.path.join("avatars", f"usuario_{user_id}.jpg")
    if os.path.exists(filepath):
        os.remove(filepath)
    return {"message": "Avatar removido"}

# ---------------------------------------------
# ROTA DE LOGOUT
# ---------------------------------------------
@app.post("/api/usuarios/logout")
def logout(response: Response):
    response.delete_cookie("vj_access_token")
    return {"message": "Logout realizado com sucesso"}

# =============================================
# ROTAS DA API - PARCEIROS
# =============================================

@app.post("/partner-auth/register", response_model=schemas.ParceiroResponse, status_code=status.HTTP_201_CREATED)
def criar_parceiro(parceiro: schemas.ParceiroCreate, db: Session = Depends(get_db)):
    parceiro_existente = db.query(models.Parceiro).filter(models.Parceiro.email == parceiro.email).first()
    if parceiro_existente:
        raise HTTPException(status_code=400, detail="Esse e-mail já está cadastrado como parceiro.")

    senha_segura = get_password_hash(parceiro.senha)
    novo_parceiro = models.Parceiro(
        nome=parceiro.nome,
        email=parceiro.email.lower(),
        telefone=parceiro.telefone,
        senha_hash=senha_segura
    )

    db.add(novo_parceiro)
    db.commit()
    db.refresh(novo_parceiro)
    return novo_parceiro

@app.post("/partner-auth/login")
def login_parceiro(parceiro: schemas.ParceiroLogin, response: Response, db: Session = Depends(get_db)):
    db_parceiro = db.query(models.Parceiro).filter(models.Parceiro.email == parceiro.email.lower()).first()
    if not db_parceiro or not verify_password(parceiro.senha, db_parceiro.senha_hash):
        raise HTTPException(status_code=401, detail="E-mail ou senha inválidos.")
    
    access_token = create_access_token(data={"sub": str(db_parceiro.id), "role": "partner"})
    response.set_cookie(
        key="vj_partner_token",
        value=access_token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    return {"message": "Login de parceiro realizado com sucesso", "nome": db_parceiro.nome}

@app.get("/partner-auth/me", response_model=schemas.ParceiroResponse)
def ler_parceiro_atual(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("vj_partner_token")
    if not token:
         raise HTTPException(status_code=401, detail="Parceiro não autenticado")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        partner_id = payload.get("sub")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Sessão inválida ou expirada")
    
    db_parceiro = db.query(models.Parceiro).filter(models.Parceiro.id == partner_id).first()
    if not db_parceiro:
         raise HTTPException(status_code=401, detail="Parceiro não encontrado")
    return db_parceiro

@app.patch("/partner-auth/me", response_model=schemas.ParceiroResponse)
def atualizar_parceiro_atual(parceiro_update: schemas.ParceiroUpdate, request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("vj_partner_token")
    if not token:
         raise HTTPException(status_code=401, detail="Parceiro não autenticado")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        partner_id = payload.get("sub")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Sessão inválida ou expirada")
    
    db_parceiro = db.query(models.Parceiro).filter(models.Parceiro.id == partner_id).first()
    if not db_parceiro:
         raise HTTPException(status_code=401, detail="Parceiro não encontrado")
         
    if parceiro_update.nome is not None:
        db_parceiro.nome = parceiro_update.nome
    if parceiro_update.telefone is not None:
        db_parceiro.telefone = parceiro_update.telefone
        
    db.commit()
    db.refresh(db_parceiro)
    return db_parceiro

@app.post("/partner-auth/logout")
def logout_parceiro(response: Response):
    response.delete_cookie("vj_partner_token")
    return {"message": "Logout de parceiro realizado com sucesso"}
