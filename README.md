Título: Venha Junto - Turismo Acessível em São Paulo

📖 Descrição

O Venha Junto é uma plataforma web desenvolvida  com o objetivo de promover o turismo acessível na cidade de São Paulo.

A plataforma permite que turistas, pessoas com deficiência (PcD), idosos, pessoas com mobilidade reduzida e seus acompanhantes encontrem estabelecimentos acessíveis, como hotéis, restaurantes, teatros, bibliotecas, centros culturais e pontos turísticos.

Além da consulta de locais, o sistema permite que parceiros cadastrem seus estabelecimentos e informem recursos de acessibilidade disponíveis, contribuindo para uma experiência turística mais inclusiva.

🎯 Objetivos
Facilitar a busca por locais acessíveis.
Promover inclusão social.
Centralizar informações sobre acessibilidade.
Incentivar estabelecimentos a investirem em acessibilidade.
Contribuir para o turismo acessível na cidade de São Paulo.

🖥️ Tecnologias Utilizadas

Front-end
HTML5
CSS3
JavaScript

Back-end
Python
FastAPI
Banco de Dados
Microsoft SQL Server

Cloud
AWS EC2
AWS S3
AWS Rekognition

APIs e Integrações
Mapbox
VLibras
UserWay
Google Translate

Ferramentas
GitHub
Visual Studio Code
Figma
Vercel

🔗 Repositórios

Durante o desenvolvimento do projeto, o Front-end e o Back-end foram separados em repositórios distintos para facilitar a hospedagem e o processo de deploy.

Inicialmente, ambos estavam no mesmo repositório. Entretanto, devido a limitações encontradas na configuração da hospedagem do Front-end na plataforma Vercel, foi necessária a criação de um repositório específico para a interface da aplicação. Essa separação permitiu realizar o deploy do Front-end de forma independente, enquanto o Back-end permaneceu hospedado separadamente.

Back-end

Responsável pelas regras de negócio, autenticação, gerenciamento dos estabelecimentos e integrações com serviços externos.

https://github.com/TCC-CAS/tcc-2025-1-e-2-venha-junto

Front-end

Responsável pela interface do usuário e experiência de navegação da plataforma.

https://github.com/Brunavieiraguedes/venha-junto-frontend

🚀 Pré-requisitos

Para executar o projeto localmente é necessário possuir:

Python 3.10 ou superior
Git
Navegador Web
Visual Studio Code (opcional)
⚙️ Instalação
Clonar o repositório do Back-end

git clone https://github.com/TCC-CAS/tcc-2025-1-e-2-venha-junto.git

Clonar o repositório do Front-end

git clone https://github.com/Brunavieiraguedes/venha-junto-frontend.git

Instalar dependências

pip install -r requirements.txt

Executar a API

uvicorn main --reload

🌐 Sistema em Produção

A aplicação pode ser acessada através dos endereços:

Aplicação Principal

https://venhajunto.vercel.app

Área Administrativa

https://venhajunto.vercel.app/html/admin-register.html

📷 Exemplos de Uso
Página Inicial

Tela principal da plataforma responsável pela busca de locais acessíveis.

<img width="1793" height="833" alt="image" src="https://github.com/user-attachments/assets/b801bb31-b2fa-4fb4-aff2-468a8a8948d5" />


Explorar Locais

Permite visualizar estabelecimentos acessíveis e seus recursos.

<img width="1791" height="863" alt="image" src="https://github.com/user-attachments/assets/ade6b334-cacd-4029-931f-a16f7b80c5ae" />

Cadastro de Parceiros

<img width="1743" height="840" alt="image" src="https://github.com/user-attachments/assets/515fa5b6-4d1b-4ace-9c9c-52241385dbdf" />


Painel Administrativo

Permite aprovar ou reprovar estabelecimentos cadastrados.

<img width="1871" height="866" alt="image" src="https://github.com/user-attachments/assets/42f5b037-df2e-4f35-bff6-575eeffa7fd0" />


♿ Recursos de Acessibilidade
VLibras
UserWay
Tradução automática
Alto contraste
Ampliação de fonte
Informações detalhadas sobre acessibilidade dos locais


👥 Equipe

Projeto desenvolvido por:

Bruna Vieira Guedes
Brenda Vieira Guedes
Sabrina Vieira Guedes

Curso: Sistemas de Informação

Instituição: Centro Universitário SENAC

Ano: 2026

🤝 Contribuindo

Este projeto possui finalidade acadêmica. Contribuições, sugestões de melhorias e correções podem ser realizadas por meio da abertura de Issues ou Pull Requests no GitHub.

📄 Licença

Este projeto foi desenvolvido exclusivamente para fins acadêmicos e educacionais como Trabalho de Conclusão de Curso (TCC).

Seu conteúdo pode ser utilizado para estudos e pesquisas, desde que citada a autoria dos desenvolvedores.
