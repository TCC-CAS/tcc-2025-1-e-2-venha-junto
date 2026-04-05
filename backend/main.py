from fastapi import FastAPI, Depends, HTTPException, status, Response, Request, UploadFile, File
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
import jwt
import os
import shutil
import uuid
from typing import List, Optional, Dict
from dotenv import load_dotenv

import models
import schemas
from database import engine, get_db
from utils.validation import validar_documento_com_receita

# Carrega as variáveis de ambiente do arquivo .env
load_dotenv()


os.makedirs("avatars", exist_ok=True)
os.makedirs("estabelecimentos_fotos", exist_ok=True)

# models.Base.metadata.create_all(bind=engine) # Comentado para evitar travamento no startup

app = FastAPI(
    title="Venha Junto API",
    description="API de Backend para o sistema de Turismo Acessível (TCC)",
    version="1.0.0"
)

# ---------------------------------------------
# CORS - PERMITIR QUE O FRONTEND ACESSE A API
# ---------------------------------------------
@app.middleware("http")
async def log_requests(request: Request, call_next):
    origin = request.headers.get("origin")
    if origin:
        print(f"[CORS DEBUG] Request from origin: {origin}")
    response = await call_next(request)
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:5501",
        "http://127.0.0.1:5501",
        "http://localhost:5505",
        "http://127.0.0.1:5505",
        "http://localhost:5506",
        "http://127.0.0.1:5506",
        "http://localhost:5507",
        "http://127.0.0.1:5507",
        "http://localhost:5508",
        "http://127.0.0.1:5508",
        "http://localhost:3000",
        "https://venha-junto-h54n.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/ping")
def ping():
    return {"status": "ok", "message": "Backend is reachable!"}

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
# CONSTANTES DE PLANOS E LIMITES 📊
# ---------------------------------------------
PLAN_LIMITS = {
    "Básico": {
        "max_establishments": 1,
        "max_photos": 3,
        "max_active_coupons": 1,
        "metrics_tier": "basic"
    },
    "Pro": {
        "max_establishments": 3,
        "max_photos": 10,
        "max_active_coupons": 5,
        "metrics_tier": "detailed"
    },
    "Pro Plus": {
        "max_establishments": 100,
        "max_photos": 100,
        "max_active_coupons": 100,
        "metrics_tier": "advanced"
    }
}

def get_partner_capacity(partner_id: int, db: Session):
    """
    Calcula a capacidade da conta do parceiro baseada no seu melhor plano ativo.
    """
    estabelecimentos = db.query(models.Estabelecimento).filter(
        models.Estabelecimento.parceiro_id == partner_id
    ).all()
    
    if not estabelecimentos:
        return PLAN_LIMITS["Básico"] # Default se não tiver nenhum ainda
        
    melhor_plano = "Básico"
    tier_map = {"Básico": 0, "Pro": 1, "Pro Plus": 2}
    
    for e in estabelecimentos:
        plano_atual = e.plano_escolhido or "Básico"
        if tier_map.get(plano_atual, 0) > tier_map.get(melhor_plano, 0):
            melhor_plano = plano_atual
            
    return PLAN_LIMITS.get(melhor_plano, PLAN_LIMITS["Básico"])

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

@app.post("/api/admin/cadastro", response_model=schemas.UsuarioResponse, status_code=status.HTTP_201_CREATED)
def criar_admin(usuario: schemas.UsuarioCreate, db: Session = Depends(get_db)):
    usuario_existente = db.query(models.Usuario).filter(models.Usuario.email == usuario.email.lower()).first()
    
    if usuario_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esse e-mail já está cadastrado."
        )

    senha_segura = get_password_hash(usuario.senha)

    novo_admin = models.Usuario(
        nome=usuario.nome,
        email=usuario.email.lower(),
        telefone=usuario.telefone,
        senha_hash=senha_segura,
        role="admin"  # Define como admin
    )

    db.add(novo_admin)
    db.commit()
    db.refresh(novo_admin)
    return novo_admin

# ---------------------------------------------
# HELPERS DE AUTENTICAÇÃO
# ---------------------------------------------
def get_user_from_token(request: Request, db: Session):
    token = request.cookies.get("vj_access_token")
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            return None
        return db.query(models.Usuario).filter(models.Usuario.id == user_id).first()
    except jwt.PyJWTError:
        return None

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

# ---------------------------------------------
# ROTAS DE AUTENTICAÇÃO (FRONTEND ADMIN COMPATÍVEL)
# ---------------------------------------------

@app.post("/auth/login")
def auth_login(usuario: schemas.UsuarioLogin, response: Response, db: Session = Depends(get_db)):
    # Reutiliza a lógica de login existente, mas com o caminho que o frontend admin espera
    db_user = db.query(models.Usuario).filter(models.Usuario.email == usuario.email.lower()).first()
    
    if not db_user or not verify_password(usuario.senha, db_user.senha_hash):
        raise HTTPException(status_code=401, detail="E-mail ou senha inválidos.")
    
    access_token = create_access_token(data={"sub": str(db_user.id)})
    
    response.set_cookie(
        key="vj_access_token",
        value=access_token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    
    return {"message": "Login realizado com sucesso", "nome": db_user.nome, "role": db_user.role}

@app.get("/auth/me", response_model=schemas.UsuarioResponse)
def auth_me(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("vj_access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Não autenticado")
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Sessão inválida")
        
    db_user = db.query(models.Usuario).filter(models.Usuario.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")
        
    return db_user

# ---------------------------------------------
# ROTAS DE FAVORITOS
# ---------------------------------------------

@app.get("/favorites/ids", response_model=List[str])
def listar_ids_favoritos(request: Request, db: Session = Depends(get_db)):
    user = get_user_from_token(request, db)
    if not user:
        return []
    
    fav_ids = db.query(models.Favorito.estabelecimento_id).filter(models.Favorito.usuario_id == user.id).all()
    # Retorna lista de strings por compatibilidade com o front
    return [str(f[0]) for f in fav_ids]

@app.get("/favorites", response_model=List[schemas.EstabelecimentoResponse])
def listar_favoritos(request: Request, db: Session = Depends(get_db)):
    user = get_user_from_token(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Não autenticado")
    
    favoritos = db.query(models.Favorito).filter(models.Favorito.usuario_id == user.id).all()
    
    estabs = []
    for fav in favoritos:
        estab = db.query(models.Estabelecimento).filter(
            models.Estabelecimento.id == fav.estabelecimento_id,
            models.Estabelecimento.status == "APPROVED",
            models.Estabelecimento.visibilidade == "ATIVO"
        ).first()
        if estab:
            # Pegando as avaliações (assim como na rota pública)
            count = db.query(func.count(models.Review.id)).filter(models.Review.estabelecimento_id == estab.id).scalar()
            avg = db.query(func.avg(models.Review.rating)).filter(models.Review.estabelecimento_id == estab.id).scalar()
            
            item = schemas.EstabelecimentoResponse.model_validate(estab)
            item.reviews_count = count or 0
            item.avg_rating = round(float(avg), 1) if avg else 0.0
            
            estabs.append(item)
            
    return estabs

@app.post("/favorites/{place_id}")
def adicionar_favorito(place_id: int, request: Request, db: Session = Depends(get_db)):
    user = get_user_from_token(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="É necessário estar logado para favoritar.")
    
    # Verifica se já existe
    existente = db.query(models.Favorito).filter(
        models.Favorito.usuario_id == user.id,
        models.Favorito.estabelecimento_id == place_id
    ).first()
    
    if existente:
        return {"message": "Já está nos favoritos"}
    
    novo_fav = models.Favorito(usuario_id=user.id, estabelecimento_id=place_id)
    db.add(novo_fav)
    db.commit()
    return {"message": "Adicionado aos favoritos"}

@app.delete("/favorites/{place_id}")
def remover_favorito(place_id: int, request: Request, db: Session = Depends(get_db)):
    user = get_user_from_token(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Não autenticado")
    
    fav = db.query(models.Favorito).filter(
        models.Favorito.usuario_id == user.id,
        models.Favorito.estabelecimento_id == place_id
    ).first()
    
    if fav:
        db.delete(fav)
        db.commit()
        return {"message": "Removido dos favoritos"}
    
    return {"message": "Favorito não encontrado"}

# @app.on_event("startup")
# async def startup_event():
#     try:
#         db = SessionLocal()
#         db.execute(text("SELECT 1"))
#         db.close()
#         print("✅ Conexão com o banco de dados estabelecida com sucesso!")
#     except Exception as e:
#         print(f"❌ Erro ao conectar ao banco de dados: {e}")

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
    
    if db_parceiro.status == "ENCERRADO":
        raise HTTPException(status_code=403, detail="Esta conta foi encerrada e não pode mais ser acessada.")
    
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

@app.get("/partner-auth/pendencies")
def verificar_pendencias_parceiro(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("vj_partner_token")
    if not token:
         raise HTTPException(status_code=401, detail="Não autenticado")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        partner_id = payload.get("sub")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Sessão inválida")
    
    # 1. Verifica planos ativos (qualquer um diferente de 'basico')
    # Planos pagos precisam ser movidos para 'basico' antes da exclusão por questões de faturamento/cancelamento.
    planos_ativos = db.query(models.Estabelecimento).filter(
        models.Estabelecimento.parceiro_id == partner_id,
        models.Estabelecimento.plano_escolhido != "basico"
    ).all()
    
    pendencias = []
    if planos_ativos:
        pendencias.append(f"Você possui {len(planos_ativos)} local(is) com plano pago ativo. Mude para o plano 'Básico' em cada local na seção 'Meus Locais' antes de solicitar a exclusão.")
        
    return {
        "has_pendencies": len(pendencias) > 0,
        "pendencies": pendencias
    }

@app.post("/partner-auth/deactivate")
def desativar_conta_parceiro(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("vj_partner_token")
    if not token:
         raise HTTPException(status_code=401, detail="Não autenticado")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        partner_id = payload.get("sub")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Sessão inválida")
        
    db_parceiro = db.query(models.Parceiro).filter(models.Parceiro.id == partner_id).first()
    if not db_parceiro:
        raise HTTPException(status_code=404, detail="Parceiro não encontrado")
        
    # 1. Altera status do parceiro
    db_parceiro.status = "INATIVO"
    
    # 2. Oculta todos os locais
    db.query(models.Estabelecimento).filter(
        models.Estabelecimento.parceiro_id == partner_id
    ).update({"visibilidade": "INATIVO"})
    
    db.commit()
    return {"message": "Sua conta foi desativada temporariamente. Seus locais não estão mais visíveis publicamente."}

@app.post("/partner-auth/delete-request")
def solicitar_exclusao_parceiro(response: Response, request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("vj_partner_token")
    if not token:
         raise HTTPException(status_code=401, detail="Não autenticado")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        partner_id = payload.get("sub")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Sessão inválida")

    db_parceiro = db.query(models.Parceiro).filter(models.Parceiro.id == partner_id).first()
    
    # Re-validar pendências (segurança extra no server-side)
    locais_pendentes = db.query(models.Estabelecimento).filter(
        models.Estabelecimento.parceiro_id == partner_id,
        models.Estabelecimento.status == "PENDING_REVIEW"
    ).first()
    planos_ativos = db.query(models.Estabelecimento).filter(
        models.Estabelecimento.parceiro_id == partner_id,
        models.Estabelecimento.plano_escolhido != "basico"
    ).first()
    
    if locais_pendentes or planos_ativos:
         raise HTTPException(status_code=400, detail="Não é possível excluir a conta enquanto houver pendências ativas.")
         
    # 1. Altera status do parceiro para ENCERRADO
    db_parceiro.status = "ENCERRADO"
    db_parceiro.is_active = False
    
    # 2. Oculta todos os locais permanentemente
    db.query(models.Estabelecimento).filter(
        models.Estabelecimento.parceiro_id == partner_id
    ).update({"visibilidade": "INATIVO"})
    
    db.commit()
    
    # 3. Faz logout
    response.delete_cookie("vj_partner_token")
    
    return {"message": "Sua conta foi encerrada com sucesso. Lamentamos te ver partir!"}

@app.post("/partner-auth/logout")
def logout_parceiro(response: Response):
    response.delete_cookie("vj_partner_token")
    return {"message": "Logout de parceiro realizado com sucesso"}

# =============================================
# ROTAS DA API - ESTABELECIMENTOS
# =============================================

@app.post("/api/estabelecimentos", response_model=schemas.EstabelecimentoResponse, status_code=status.HTTP_201_CREATED)
async def criar_estabelecimento(estab_data: schemas.EstabelecimentoCreate, request: Request, db: Session = Depends(get_db)):
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
         
    # --- NOVO: Lógica de Capacidade da Conta ---
    capacidade = get_partner_capacity(partner_id, db)
    contagem_atual = db.query(models.Estabelecimento).filter(models.Estabelecimento.parceiro_id == partner_id).count()
    
    if contagem_atual >= capacidade["max_establishments"]:
        raise HTTPException(
            status_code=403, 
            detail=f"Você atingiu o limite de locais para o seu plano atual ({capacidade['max_establishments']}). Faça upgrade para cadastrar mais."
        )
    # -------------------------------------------
    novo_estab = models.Estabelecimento(
        parceiro_id=db_parceiro.id,
        nome_responsavel=estab_data.nome_responsavel,
        email_responsavel=estab_data.email_responsavel,
        telefone_responsavel=estab_data.telefone_responsavel,
        nome=estab_data.nome,
        tipo=estab_data.tipo,
        descricao=estab_data.descricao,
        cep=estab_data.cep,
        endereco=estab_data.endereco,
        numero_apto=estab_data.numero_apto,
        bairro=estab_data.bairro,
        cidade=estab_data.cidade,
        estado=estab_data.estado,
        mostrar_mapa=estab_data.mostrar_mapa,
        telefone_local=estab_data.telefone_local,
        whatsapp_local=estab_data.whatsapp_local,
        email_local=estab_data.email_local,
        site_local=estab_data.site_local,
        horario_funcionamento=estab_data.horario_funcionamento,
        recursos_acessibilidade=estab_data.recursos_acessibilidade,
        plano_escolhido=estab_data.plano_escolhido,
        cnpj_cpf=estab_data.cnpj_cpf,
        status="APPROVED" # Aprovação Automática após validação
    )
    
    # Validação REAL e Automática (AIRBNB Style) 🚀
    if estab_data.cnpj_cpf:
        await validar_documento_com_receita(estab_data.cnpj_cpf)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O preenchimento do CNPJ ou CPF é obrigatório para validação automática."
        )
    
    db.add(novo_estab)
    db.commit()
    db.refresh(novo_estab)
    
    # Criar Cupom se foi enviado
    if estab_data.cupom:
        novo_cupom = models.Cupom(
            estabelecimento_id=novo_estab.id,
            titulo=estab_data.cupom.titulo,
            codigo=estab_data.cupom.codigo,
            descricao=estab_data.cupom.descricao,
            tipo_desconto=estab_data.cupom.tipo_desconto,
            valor=estab_data.cupom.valor,
            validade=estab_data.cupom.validade,
            regras=estab_data.cupom.regras
        )
        db.add(novo_cupom)
        db.commit()
        db.refresh(novo_estab) # refresh para carregar relacionamento
        
    return novo_estab

@app.get("/api/estabelecimentos", response_model=list[schemas.EstabelecimentoResponse])
def listar_estabelecimentos(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("vj_partner_token")
    if not token:
         raise HTTPException(status_code=401, detail="Parceiro não autenticado")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        partner_id = payload.get("sub")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Sessão inválida ou expirada")
    
    results = db.query(models.Estabelecimento).filter(
        models.Estabelecimento.parceiro_id == partner_id,
        models.Estabelecimento.status != "ARCHIVED"
    ).all()
    
    res = []
    for estab in results:
        # Nota: otimização simplificada para o TCC
        count = db.query(func.count(models.Review.id)).filter(models.Review.estabelecimento_id == estab.id).scalar()
        avg = db.query(func.avg(models.Review.rating)).filter(models.Review.estabelecimento_id == estab.id).scalar()
        fav_count = db.query(func.count(models.Favorito.id)).filter(models.Favorito.estabelecimento_id == estab.id).scalar()
        
        item = schemas.EstabelecimentoResponse.model_validate(estab)
        item.reviews_count = count or 0
        item.avg_rating = float(f"{float(avg):.1f}") if avg else 0.0
        item.favorites_count = fav_count or 0
        # Views e Clicks já vem do model_validate(estab) se estiverem no schema
        res.append(item)
        
    return res

@app.get("/api/estabelecimentos/{id}", response_model=schemas.EstabelecimentoResponse)
def obter_estabelecimento(id: int, request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("vj_partner_token")
    if not token:
         raise HTTPException(status_code=401, detail="Parceiro não autenticado")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        partner_id = payload.get("sub")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Sessão inválida ou expirada")
    
    estab = db.query(models.Estabelecimento).filter(
        models.Estabelecimento.id == id, 
        models.Estabelecimento.parceiro_id == partner_id
    ).first()
    
    if not estab:
        raise HTTPException(status_code=404, detail="Estabelecimento não encontrado")
    
    return estab

@app.patch("/api/estabelecimentos/{id}")
def atualizar_estabelecimento(id: int, estab_update: schemas.EstabelecimentoUpdate, request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("vj_partner_token")
    if not token:
         raise HTTPException(status_code=401, detail="Parceiro não autenticado")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        partner_id = payload.get("sub")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Sessão inválida ou expirada")
    
    db_estab = db.query(models.Estabelecimento).filter(
        models.Estabelecimento.id == id, 
        models.Estabelecimento.parceiro_id == partner_id
    ).first()
    
    if not db_estab:
        raise HTTPException(status_code=404, detail="Estabelecimento não encontrado")
    
    update_data = estab_update.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(db_estab, key, value)
    
    db.commit()
    db.refresh(db_estab)
    
    return {
        "message": "Alterações salvas e publicadas com sucesso.",
        "critico": False,
        "data": schemas.EstabelecimentoResponse.model_validate(db_estab).model_dump()
    }

@app.delete("/api/estabelecimentos/{id}")
def solicitar_exclusao_estabelecimento(
    id: int,
    request: Request,
    db: Session = Depends(get_db),
    force: bool = False  # ?force=true pula validação de cupons
):
    token = request.cookies.get("vj_partner_token")
    if not token:
         raise HTTPException(status_code=401, detail="Parceiro não autenticado")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        partner_id = payload.get("sub")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Sessão inválida ou expirada")
    
    db_estab = db.query(models.Estabelecimento).filter(
        models.Estabelecimento.id == id, 
        models.Estabelecimento.parceiro_id == partner_id
    ).first()
    
    if not db_estab:
        raise HTTPException(status_code=404, detail="Estabelecimento não encontrado")

    # Verificar cupons ativos antes de remover
    if not force:
        cupons_ativos = db.query(models.Cupom).filter(
            models.Cupom.estabelecimento_id == id,
            models.Cupom.ativo == True
        ).count()
        if cupons_ativos > 0:
            raise HTTPException(
                status_code=409,
                detail=f"CUPONS_ATIVOS:{cupons_ativos}"
            )
    
    # Mudar status para ARCHIVED (Esconde do parceiro e do público imediatamente)
    db_estab.status = "ARCHIVED"
    db_estab.visibilidade = "INATIVO" 
    db.commit()
    
    return {"message": "O estabelecimento foi removido com sucesso de sua lista e da plataforma pública."}


# =============================================
# ROTA DE VISIBILIDADE (PARCEIRO) 👁️
# =============================================

@app.patch("/api/estabelecimentos/{id}/visibilidade")
def gerenciar_visibilidade(
    id: int,
    dados: schemas.VisibilidadeUpdate,
    request: Request,
    db: Session = Depends(get_db)
):
    token = request.cookies.get("vj_partner_token")
    if not token:
        raise HTTPException(status_code=401, detail="Parceiro não autenticado")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        partner_id = payload.get("sub")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Sessão inválida ou expirada")

    db_estab = db.query(models.Estabelecimento).filter(
        models.Estabelecimento.id == id,
        models.Estabelecimento.parceiro_id == partner_id
    ).first()
    if not db_estab:
        raise HTTPException(status_code=404, detail="Estabelecimento não encontrado")

    acao = dados.acao

    if acao == "REATIVAR":
        db_estab.visibilidade = "ATIVO"
        db_estab.oculto_ate = None
        msg = "Estabelecimento reativado com sucesso. Já está visível na plataforma."

    elif acao == "DESATIVAR":
        db_estab.visibilidade = "INATIVO"
        db_estab.oculto_ate = None
        msg = "Estabelecimento desativado. Não aparecerá na plataforma até ser reativado."

    elif acao == "OCULTAR_PERIODO":
        if not dados.oculto_ate:
            raise HTTPException(status_code=400, detail="Informe a data de fim do período de ocultação.")
        from datetime import date as date_type
        db_estab.visibilidade = "OCULTO_TEMPORARIO"
        db_estab.oculto_ate = dados.oculto_ate
        msg = f"Estabelecimento ocultado até {dados.oculto_ate.strftime('%d/%m/%Y')}."
    else:
        raise HTTPException(status_code=400, detail="Ação inválida. Use: REATIVAR, DESATIVAR ou OCULTAR_PERIODO")

    db.commit()
    db.refresh(db_estab)
    return {
        "message": msg,
        "visibilidade": db_estab.visibilidade,
        "oculto_ate": db_estab.oculto_ate.isoformat() if db_estab.oculto_ate else None
    }

# ---------------------------------------------
# ROTAS DE FOTOS - ESTABELECIMENTOS
# ---------------------------------------------

def validar_imagem(file: UploadFile):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Arquivo sem nome.")
        
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
        raise HTTPException(status_code=400, detail="Apenas JPG, JPEG, PNG ou WEBP são permitidos.")
    
    # Verificação de tamanho (10MB)
    MAX_SIZE = 10 * 1024 * 1024 
    content = file.file.read(MAX_SIZE + 1)
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="A imagem é muito grande (máximo 10MB).")
    
    file.file.seek(0)
    return True

@app.post("/api/estabelecimentos/{id}/foto-perfil")
def upload_foto_perfil(id: int, request: Request, file: UploadFile = File(...), db: Session = Depends(get_db)):
    token = request.cookies.get("vj_partner_token")
    if not token:
         raise HTTPException(status_code=401, detail="Parceiro não autenticado")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        partner_id = payload.get("sub")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Sessão inválida ou expirada")
    
    db_estab = db.query(models.Estabelecimento).filter(
        models.Estabelecimento.id == id, 
        models.Estabelecimento.parceiro_id == partner_id
    ).first()
    
    if not db_estab:
        raise HTTPException(status_code=404, detail="Estabelecimento não encontrado")
    
    validar_imagem(file)
    
    ext = os.path.splitext(file.filename)[1].lower()
    filename = f"perfil_{id}_{uuid.uuid4().hex}{ext}"
    filepath = os.path.join("estabelecimentos_fotos", filename)
    
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Deletar foto antiga se existir
    if db_estab.foto_perfil:
        old_path = os.path.join("estabelecimentos_fotos", db_estab.foto_perfil)
        if os.path.exists(old_path):
            os.remove(old_path)
            
    db_estab.foto_perfil = filename
    db.commit()
    
    return {"message": "Foto de perfil atualizada", "filename": filename}

@app.post("/api/estabelecimentos/{id}/galeria")
def upload_galeria(id: int, request: Request, file: UploadFile = File(...), db: Session = Depends(get_db)):
    token = request.cookies.get("vj_partner_token")
    if not token:
         raise HTTPException(status_code=401, detail="Parceiro não autenticado")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        partner_id = payload.get("sub")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Sessão inválida ou expirada")
    
    db_estab = db.query(models.Estabelecimento).filter(
        models.Estabelecimento.id == id, 
        models.Estabelecimento.parceiro_id == partner_id
    ).first()
    
    if not db_estab:
        raise HTTPException(status_code=404, detail="Estabelecimento não encontrado")
    
    validar_imagem(file)
    
    ext = os.path.splitext(file.filename)[1].lower()
    filename = f"galeria_{id}_{uuid.uuid4().hex}{ext}"
    filepath = os.path.join("estabelecimentos_fotos", filename)
    
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Salvar na galeria (armazenado como string separada por vírgula)
    fotos = db_estab.fotos_galeria.split(",") if db_estab.fotos_galeria else []
    fotos.append(filename)
    db_estab.fotos_galeria = ",".join(fotos)
    db.commit()
    
    return {"message": "Foto adicionada à galeria", "filename": filename}

@app.get("/public/places", response_model=List[schemas.EstabelecimentoResponse])
def listar_locais_publicos(
    cidade: Optional[str] = None, 
    tipo: Optional[str] = None, 
    verified_first: bool = False,
    db: Session = Depends(get_db)
):
    from sqlalchemy.sql.expression import case

    query = db.query(models.Estabelecimento).join(models.Parceiro).filter(
        models.Estabelecimento.status == "APPROVED",
        models.Estabelecimento.visibilidade == "ATIVO",
        models.Parceiro.status == "ATIVO"
    )
    
    if cidade:
        query = query.filter(models.Estabelecimento.cidade.ilike(f"%{cidade}%"))
    if tipo:
        query = query.filter(models.Estabelecimento.tipo.ilike(f"%{tipo}%"))
        
    # Lógica de Ordenação de Planos: 1° Pro Plus, 2° Pro, 3° Básico/Demais
    ordem_planos = case(
        (models.Estabelecimento.plano_escolhido == "Pro Plus", 1),
        (models.Estabelecimento.plano_escolhido == "Pro", 2),
        (models.Estabelecimento.plano_escolhido == "Básico", 3),
        else_=4
    )
    query = query.order_by(ordem_planos)
    
    if verified_first:
        # Simplificando: prioriza os APPROVED por ordem de criação ou similar se necessário
        query = query.order_by(models.Estabelecimento.created_at.desc())
        
    results = query.all()
    
    res = []
    for estab in results:
        try:
            # Nota: estas queries podem ser otimizadas com joins em sistemas maiores
            count = db.query(func.count(models.Review.id)).filter(models.Review.estabelecimento_id == estab.id).scalar()
            avg = db.query(func.avg(models.Review.rating)).filter(models.Review.estabelecimento_id == estab.id).scalar()
            
            # Inicializar item com os dados do banco antes de processar lógica extra
            item = schemas.EstabelecimentoResponse.model_validate(estab)

            # ---------------------------------------------------------
            # Regra de Ocultação Dinâmica de Fotos (Downgrade Seguro)
            # ---------------------------------------------------------
            plano = estab.plano_escolhido or "Básico"
            if plano in PLAN_LIMITS:
                limite_fotos = PLAN_LIMITS[plano]["max_photos"]
                if item.fotos_galeria:
                    lista_fotos = item.fotos_galeria.split(",")
                    if len(lista_fotos) > limite_fotos:
                        # Trunca a lista para exibição pública, mas mantém no banco
                        item.fotos_galeria = ",".join(lista_fotos[:limite_fotos])
            # ---------------------------------------------------------

            item.reviews_count = count or 0
            item.avg_rating = round(float(avg), 1) if avg else 0.0
            res.append(item)
        except Exception as e:
            # Ignora registros que não passam na validação do schema (ex: campos obrigatórios nulos)
            print(f"[RECOVERY] Ignorando local ID {estab.id} por erro: {str(e)}")
            continue
            
    return res

@app.get("/public/places/{id}", response_model=schemas.EstabelecimentoResponse)
def obter_local_publico(id: int, db: Session = Depends(get_db)):
    from datetime import date as date_type
    hoje = date_type.today()

    estab = db.query(models.Estabelecimento).join(models.Parceiro).filter(
        models.Estabelecimento.id == id,
        models.Estabelecimento.status == "APPROVED",
        models.Estabelecimento.visibilidade == "ATIVO",
        models.Parceiro.status == "ATIVO"
    ).first()
    
    if not estab:
        raise HTTPException(status_code=404, detail="Estabelecimento não encontrado ou temporariamente indisponível.")
    
    # Preencher rating real
    count = db.query(func.count(models.Review.id)).filter(models.Review.estabelecimento_id == id).scalar()
    avg = db.query(func.avg(models.Review.rating)).filter(models.Review.estabelecimento_id == id).scalar()
    
    # Incrementar View Count (Total)
    estab.views_count = (estab.views_count or 0) + 1
    
    # Incrementar Métrica Diária (Histórico)
    _incrementar_metrica_diaria(db, id, "view")
    
    db.commit()
    db.refresh(estab)

    res = schemas.EstabelecimentoResponse.model_validate(estab)
    res.reviews_count = count or 0
    res.avg_rating = round(float(avg), 1) if avg else 0.0

    # ---------------------------------------------------------
    # Regra de Ocultação Dinâmica de Fotos (Downgrade Seguro)
    # ---------------------------------------------------------
    plano = estab.plano_escolhido or "Básico"
    if plano in PLAN_LIMITS:
        limite_fotos = PLAN_LIMITS[plano]["max_photos"]
        if res.fotos_galeria:
            lista_fotos = res.fotos_galeria.split(",")
            if len(lista_fotos) > limite_fotos:
                # Trunca a lista para exibição pública, mas mantém no banco
                res.fotos_galeria = ",".join(lista_fotos[:limite_fotos])
    # ---------------------------------------------------------
    
    return res

@app.post("/public/places/{id}/click")
def registrar_clique_publico(id: int, db: Session = Depends(get_db)):
    estab = db.query(models.Estabelecimento).filter(models.Estabelecimento.id == id).first()
    if not estab:
        raise HTTPException(status_code=404, detail="Local não encontrado")
    
    # Incrementar Clicks (Total)
    estab.clicks_count = (estab.clicks_count or 0) + 1
    
    # Incrementar Métrica Diária (Histórico)
    _incrementar_metrica_diaria(db, id, "click")
    
    db.commit()
    return {"message": "Clique registrado"}

def _incrementar_metrica_diaria(db: Session, estab_id: int, tipo: str):
    """Auxiliar para incrementar visualização ou clique do dia atual."""
    from datetime import date
    hoje = date.today()
    
    metrica = db.query(models.MetricaDiaria).filter(
        models.MetricaDiaria.estabelecimento_id == estab_id,
        models.MetricaDiaria.data == hoje
    ).first()
    
    if not metrica:
        metrica = models.MetricaDiaria(estabelecimento_id=estab_id, data=hoje, views=0, clicks=0)
        db.add(metrica)
        # Flush para ter o objeto persistido antes de incrementar
        db.flush()
    
    if tipo == "view":
        metrica.views += 1
    elif tipo == "click":
        metrica.clicks += 1

@app.get("/api/estabelecimentos/{id}/metricas-7dias", response_model=List[schemas.MetricaDiariaResponse])
def obter_metricas_7dias(id: int, request: Request, db: Session = Depends(get_db)):
    """Retorna o histórico dos últimos 7 dias para o dashboard do parceiro."""
    # Autenticação Básica do Parceiro
    token = request.cookies.get("vj_partner_token")
    if not token:
         raise HTTPException(status_code=401, detail="Parceiro não autenticado")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        partner_id = payload.get("sub")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Sessão inválida ou expirada")

    # Verifica se o local pertence ao parceiro
    estab = db.query(models.Estabelecimento).filter(
        models.Estabelecimento.id == id,
        models.Estabelecimento.parceiro_id == partner_id
    ).first()
    
    if not estab:
        raise HTTPException(status_code=404, detail="Estabelecimento não encontrado")

    from datetime import date, timedelta
    hoje = date.today()
    há_7_dias = hoje - timedelta(days=6) # 7 dias incluindo hoje
    
    result = db.query(models.MetricaDiaria).filter(
        models.MetricaDiaria.estabelecimento_id == id,
        models.MetricaDiaria.data >= há_7_dias
    ).order_by(models.MetricaDiaria.data.asc()).all()
    
    return result

@app.get("/api/estabelecimentos/fotos/{filename}")
def get_estabelecimento_foto(filename: str):
    filepath = os.path.join("estabelecimentos_fotos", filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Foto não encontrada")
    return FileResponse(filepath)

@app.delete("/api/estabelecimentos/{id}/fotos/{filename}")
def deletar_foto(id: int, filename: str, request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("vj_partner_token")
    if not token:
         raise HTTPException(status_code=401, detail="Parceiro não autenticado")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        partner_id = payload.get("sub")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Sessão inválida ou expirada")
    
    db_estab = db.query(models.Estabelecimento).filter(
        models.Estabelecimento.id == id, 
        models.Estabelecimento.parceiro_id == partner_id
    ).first()
    
    if not db_estab:
        raise HTTPException(status_code=404, detail="Estabelecimento não encontrado")
    
    filepath = os.path.join("estabelecimentos_fotos", filename)
    
    if filename == db_estab.foto_perfil:
        db_estab.foto_perfil = None
    else:
        fotos = db_estab.fotos_galeria.split(",") if db_estab.fotos_galeria else []
        if filename in fotos:
            fotos.remove(filename)
            db_estab.fotos_galeria = ",".join(fotos)
        else:
            raise HTTPException(status_code=404, detail="Foto não encontrada na galeria")
            
    if os.path.exists(filepath):
        os.remove(filepath)
        
    db.commit()
    return {"message": "Foto removida com sucesso"}

# =============================================
# ROTAS ADMIN - GESTÃO E APROVAÇÃO
# =============================================

@app.get("/api/admin/estabelecimentos", response_model=List[schemas.EstabelecimentoResponse])
def admin_listar_estabelecimentos(request: Request, db: Session = Depends(get_db), status: str = "PENDING_REVIEW"):
    token = request.cookies.get("vj_access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Não autenticado")
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Sessão inválida")
        
    db_user = db.query(models.Usuario).filter(models.Usuario.id == user_id).first()
    if not db_user or db_user.role != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado: apenas administradores.")
    
    return db.query(models.Estabelecimento).filter(models.Estabelecimento.status == status).all()

@app.post("/api/admin/estabelecimentos/{id}/approve")
def admin_aprovar_estabelecimento(id: int, request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("vj_access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Não autenticado")
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Sessão inválida")
        
    db_user = db.query(models.Usuario).filter(models.Usuario.id == user_id).first()
    if not db_user or db_user.role != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    db_estab = db.query(models.Estabelecimento).filter(models.Estabelecimento.id == id).first()
    if not db_estab:
        raise HTTPException(status_code=404, detail="Estabelecimento não encontrado")
        
    db_estab.status = "APPROVED"
    db.commit()
    return {"message": "Estabelecimento aprovado com sucesso"}

@app.post("/api/admin/estabelecimentos/{id}/reject")
def admin_rejeitar_estabelecimento(id: int, request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("vj_access_token")
    # Ajustando para usar vj_access_token consistentemente para admin
    token = request.cookies.get("vj_access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Não autenticado")
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Sessão inválida")
        
    db_user = db.query(models.Usuario).filter(models.Usuario.id == user_id).first()
    if not db_user or db_user.role != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    db_estab = db.query(models.Estabelecimento).filter(models.Estabelecimento.id == id).first()
    if not db_estab:
        raise HTTPException(status_code=404, detail="Estabelecimento não encontrado")
        
    db_estab.status = "REJECTED"
    db.commit()
    return {"message": "Estabelecimento reprovado"}

# =============================================
# ROTA ADMIN: CONFIRMAR EXCLUSÃO PERMANENTE 🗑️
# =============================================

@app.post("/api/admin/estabelecimentos/{id}/confirm-delete")
def admin_confirmar_exclusao(id: int, request: Request, db: Session = Depends(get_db)):
    """Admin confirma e executa a exclusão permanente de um estabelecimento com PENDING_DELETE."""
    token = request.cookies.get("vj_access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Não autenticado")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Sessão inválida")

    db_user = db.query(models.Usuario).filter(models.Usuario.id == user_id).first()
    if not db_user or db_user.role != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado: apenas administradores.")

    db_estab = db.query(models.Estabelecimento).filter(models.Estabelecimento.id == id).first()
    if not db_estab:
        raise HTTPException(status_code=404, detail="Estabelecimento não encontrado")

    if db_estab.status != "PENDING_DELETE":
        raise HTTPException(
            status_code=400,
            detail="Este estabelecimento não está na fila de exclusão. Apenas estabelecimentos com status PENDING_DELETE podem ser excluídos por esta rota."
        )

    # Remove fotos do disco antes de deletar do banco
    if db_estab.foto_perfil:
        fp = os.path.join("estabelecimentos_fotos", db_estab.foto_perfil)
        if os.path.exists(fp):
            os.remove(fp)
    if db_estab.fotos_galeria:
        for filename in db_estab.fotos_galeria.split(","):
            fp = os.path.join("estabelecimentos_fotos", filename.strip())
            if fp and os.path.exists(fp):
                os.remove(fp)

    nome_estab = db_estab.nome
    db.delete(db_estab)
    db.commit()
    return {"message": f"Estabelecimento '{nome_estab}' (#{id}) foi excluído permanentemente do sistema."}
# =============================================
# ROTAS DE AVALIAÇÕES (PUBLIC)
# =============================================

@app.get("/public/places/{id}/reviews", response_model=List[schemas.ReviewResponse])
def listar_reviews(id: int, db: Session = Depends(get_db)):
    reviews = db.query(models.Review).filter(models.Review.estabelecimento_id == id).all()
    
    # Mapear para incluir o nome do usuário
    res = []
    for r in reviews:
        item = schemas.ReviewResponse.model_validate(r)
        item.usuario_nome = r.usuario.nome if r.usuario else "Anônimo"
        res.append(item)
    return res

@app.post("/public/places/{id}/reviews", response_model=schemas.ReviewResponse)
def criar_review(id: int, review: schemas.ReviewCreate, request: Request, db: Session = Depends(get_db)):
    user = get_user_from_token(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Faça login para avaliar.")
    
    # Verifica se já avaliou para ATUALIZAR em vez de dar erro (Padrão Google Maps/Tripadvisor)
    existente = db.query(models.Review).filter(
        models.Review.estabelecimento_id == id,
        models.Review.usuario_id == user.id
    ).first()
    
    if existente:
        existente.rating = review.rating
        existente.comment = review.comment
        existente.created_at = datetime.utcnow()
        db.commit()
        db.refresh(existente)
        res = schemas.ReviewResponse.model_validate(existente)
        res.usuario_nome = user.nome
        return res

    novo_review = models.Review(
        estabelecimento_id=id,
        usuario_id=user.id,
        rating=review.rating,
        comment=review.comment
    )
    
    db.add(novo_review)
    db.commit()
    db.refresh(novo_review)
    
    res = schemas.ReviewResponse.model_validate(novo_review)
    res.usuario_nome = user.nome
    return res

# =============================================
# ROTAS DE CUPONS (PARCEIRO) 🎟️
# =============================================

def _get_partner_from_token(request: Request, db: Session):
    """Helper: decodifica o token do parceiro e retorna o objeto do DB."""
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

@app.post("/api/estabelecimentos/{estab_id}/cupons", response_model=schemas.CupomResponse, status_code=201)
def criar_cupom(estab_id: int, cupom: schemas.CupomCreate, request: Request, db: Session = Depends(get_db)):
    parceiro = _get_partner_from_token(request, db)

    estab = db.query(models.Estabelecimento).filter(
        models.Estabelecimento.id == estab_id,
        models.Estabelecimento.parceiro_id == parceiro.id
    ).first()
    if not estab:
        raise HTTPException(status_code=404, detail="Estabelecimento não encontrado")

    # Paywall: apenas planos pagos
    plano = (estab.plano_escolhido or "").lower()
    if not (plano.startswith("pro") or "premium" in plano or "plus" in plano):
        raise HTTPException(
            status_code=403,
            detail="Criação de cupons é exclusiva para planos Pro ou Premium."
        )

    novo_cupom = models.Cupom(
        estabelecimento_id=estab_id,
        titulo=cupom.titulo,
        codigo=cupom.codigo.upper(),
        descricao=cupom.descricao,
        tipo_desconto=cupom.tipo_desconto,
        valor=cupom.valor,
        validade=cupom.validade,
        regras=cupom.regras,
    )
    db.add(novo_cupom)
    db.commit()
    db.refresh(novo_cupom)
    return novo_cupom

@app.get("/api/estabelecimentos/{estab_id}/cupons", response_model=List[schemas.CupomResponse])
def listar_cupons(estab_id: int, request: Request, db: Session = Depends(get_db)):
    parceiro = _get_partner_from_token(request, db)

    estab = db.query(models.Estabelecimento).filter(
        models.Estabelecimento.id == estab_id,
        models.Estabelecimento.parceiro_id == parceiro.id
    ).first()
    if not estab:
        raise HTTPException(status_code=404, detail="Estabelecimento não encontrado")

    return db.query(models.Cupom).filter(models.Cupom.estabelecimento_id == estab_id).all()

@app.patch("/api/cupons/{cupom_id}", response_model=schemas.CupomResponse)
def atualizar_cupom(cupom_id: int, dados: schemas.CupomUpdate, request: Request, db: Session = Depends(get_db)):
    parceiro = _get_partner_from_token(request, db)

    cupom = db.query(models.Cupom).filter(models.Cupom.id == cupom_id).first()
    if not cupom:
        raise HTTPException(status_code=404, detail="Cupom não encontrado")

    # Garante que o cupom pertence ao parceiro
    estab = db.query(models.Estabelecimento).filter(
        models.Estabelecimento.id == cupom.estabelecimento_id,
        models.Estabelecimento.parceiro_id == parceiro.id
    ).first()
    if not estab:
        raise HTTPException(status_code=403, detail="Sem permissão para editar este cupom")

    for key, value in dados.model_dump(exclude_unset=True).items():
        setattr(cupom, key, value)

    db.commit()
    db.refresh(cupom)
    return cupom

@app.delete("/api/cupons/{cupom_id}", status_code=204)
def deletar_cupom(cupom_id: int, request: Request, db: Session = Depends(get_db)):
    parceiro = _get_partner_from_token(request, db)

    cupom = db.query(models.Cupom).filter(models.Cupom.id == cupom_id).first()
    if not cupom:
        raise HTTPException(status_code=404, detail="Cupom não encontrado")

    estab = db.query(models.Estabelecimento).filter(
        models.Estabelecimento.id == cupom.estabelecimento_id,
        models.Estabelecimento.parceiro_id == parceiro.id
    ).first()
    if not estab:
        raise HTTPException(status_code=403, detail="Sem permissão para deletar este cupom")

    db.delete(cupom)
    db.commit()
    return None

@app.get("/public/places/{id}/cupons", response_model=List[schemas.CupomResponse])
def listar_cupons_publico(id: int, db: Session = Depends(get_db)):
    """Retorna cupons ativos de um local para visitantes."""
    return db.query(models.Cupom).filter(
        models.Cupom.estabelecimento_id == id,
        models.Cupom.ativo == True
    ).all()
