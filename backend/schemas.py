from pydantic import BaseModel, EmailStr
from typing import Optional

# ---------------------------------------------
# DADOS RECEBIDOS DO FRONTEND ("CRIAR CONTA")
# ---------------------------------------------
class UsuarioCreate(BaseModel):
    nome: str
    telefone: Optional[str] = None
    email: EmailStr  # Exige que seja um formato válido de E-mail
    senha: str
    
    class Config:
        # Exemplo que aparece na documentação do Swagger
        json_schema_extra = {
            "example": {
                "nome": "Bruna Silva",
                "telefone": "11999999999",
                "email": "bruna@exemplo.com",
                "senha": "SenhaForte123@"
            }
        }


# ---------------------------------------------
# DADOS DEVOLVIDOS PELA API AO FRONTEND
# ---------------------------------------------
class UsuarioResponse(BaseModel):
    id: int
    nome: str
    email: EmailStr
    telefone: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True  # Permite ler dados do modelo SQLAlchemy internamente

# ---------------------------------------------
# DADOS RECEBIDOS DO FRONTEND ("LOGIN")
# ---------------------------------------------
class UsuarioLogin(BaseModel):
    email: EmailStr
    senha: str

# ---------------------------------------------
# DADOS PARA ATUALIZAR O PERFIL (FRONTEND -> API)
# ---------------------------------------------
class UsuarioUpdate(BaseModel):
    nome: Optional[str] = None
    telefone: Optional[str] = None

# =============================================
# SCHEMAS PARA PARCEIROS
# =============================================

class ParceiroCreate(BaseModel):
    nome: str
    telefone: Optional[str] = None
    email: EmailStr
    senha: str

class ParceiroResponse(BaseModel):
    id: int
    nome: str
    email: EmailStr
    telefone: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True

class ParceiroLogin(BaseModel):
    email: EmailStr
    senha: str

class ParceiroUpdate(BaseModel):
    nome: Optional[str] = None
    telefone: Optional[str] = None

