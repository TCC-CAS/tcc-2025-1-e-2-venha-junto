#!/bin/bash
# Este script cria o arquivo de configuração na Vercel com segurança
mkdir -p public/js
echo "window.ENV = { MAPBOX_TOKEN: '$MAPBOX_TOKEN' };" > public/js/config.js
echo "Arquivo config.js gerado com sucesso!"
