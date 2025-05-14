# Fluxo de Upload e Processamento de Arquivos

## Visão Geral

Este documento detalha o fluxo completo de upload e processamento de arquivos no sistema, desde a seleção do arquivo pelo usuário até o armazenamento no servidor e exibição na interface.

## Tipos de Upload

O sistema suporta três tipos principais de upload:

1. **Feed** - Imagens e vídeos para postagens no feed do Instagram
2. **Stories** - Imagens e vídeos para stories do Instagram (formato 1080×1920)
3. **Carrossel** - Múltiplas imagens para postagens de carrossel no Instagram

## Fluxo de Upload para Feed

### Frontend (JavaScript)

1. **Seleção do arquivo**:
   - Usuário clica no botão "Selecionar arquivo" ou arrasta um arquivo para a área de upload
   - O evento é capturado pelo `upload-fix.js` que aciona o input de arquivo

2. **Processamento do arquivo**:
   - O arquivo é validado (tipo, tamanho)
   - Um preview é gerado e exibido na interface
   - O arquivo é armazenado temporariamente para envio posterior

3. **Feedback visual**:
   - Ícones e mensagens indicam o status do upload
   - Estilos CSS são aplicados para mostrar o progresso

### Backend (PHP)

1. **Recebimento do arquivo**:
   - O arquivo é recebido via POST no formulário
   - Os dados são validados no servidor

2. **Processamento e armazenamento**:
   - Um nome único é gerado para o arquivo
   - O arquivo é movido para o diretório correto
   - Os metadados são armazenados para uso posterior

## Fluxo de Upload para Stories

### Frontend (JavaScript)

1. **Seleção do arquivo**:
   - Usuário clica no botão "Selecionar arquivo" ou arrasta um arquivo para a área de upload específica para Stories
   - O evento é capturado pelo `story-upload-handler.js`

2. **Processamento do arquivo**:
   - O arquivo é enviado para o `story-processor.js`
   - A imagem é redimensionada para o formato de Stories (1080×1920)
   - Se a imagem não tiver as dimensões exatas, ela é centralizada em um fundo branco
   - Um preview é gerado e exibido na interface

3. **Feedback visual**:
   - Ícones e mensagens indicam o status do upload
   - O preview mostra como a imagem ficará no formato de Stories

### Backend (PHP)

1. **Recebimento do arquivo**:
   - O arquivo processado é recebido via POST
   - Os dados são validados no servidor

2. **Processamento e armazenamento**:
   - Um nome único é gerado para o arquivo
   - O arquivo é movido para o diretório correto
   - Os metadados são armazenados para uso posterior

## Fluxo de Upload para Carrossel

### Frontend (JavaScript)

1. **Seleção dos arquivos**:
   - Usuário seleciona múltiplos arquivos ou arrasta vários arquivos para a área de upload
   - O evento é capturado pelo `carousel-upload.js`

2. **Processamento dos arquivos**:
   - Cada arquivo é validado individualmente
   - Previews são gerados para cada arquivo
   - Os arquivos são armazenados temporariamente para envio posterior

3. **Feedback visual**:
   - Uma galeria de previews é exibida
   - Opções para reordenar ou remover imagens são fornecidas

### Backend (PHP)

1. **Recebimento dos arquivos**:
   - Os arquivos são recebidos via POST
   - Os dados são validados no servidor

2. **Processamento e armazenamento**:
   - Nomes únicos são gerados para cada arquivo
   - Os arquivos são movidos para o diretório correto
   - Os metadados são armazenados em formato JSON para uso posterior

## Problemas Identificados e Soluções

### 1. Upload de Feed requer dois cliques para selecionar o arquivo

**Problema**:
- O primeiro clique no botão de upload não acionava o input de arquivo
- Era necessário clicar duas vezes para abrir o seletor de arquivos

**Causa**:
- Conflito de event listeners
- Problemas com a propagação de eventos

**Solução**:
- Implementação de um sistema robusto em `upload-fix.js` (versão 3.1) que:
  - Clona os botões para remover todos os event listeners anteriores
  - Adiciona novos event listeners limpos
  - Garante que o input de arquivo seja acionado corretamente no primeiro clique

### 2. Upload de Stories não funciona corretamente

**Problema**:
- O arquivo era selecionado, mas não mostrava o preview
- O arquivo não era enviado corretamente para o servidor

**Causa**:
- Referências incorretas a elementos DOM
- Problemas no processamento da imagem
- Falhas no feedback visual

**Solução**:
- Correção das referências a elementos DOM em `story-upload-handler.js`
- Melhoria no processamento de imagens em `story-processor.js`
- Implementação de um feedback visual mais robusto

### 3. Processamento de imagens para Stories

**Problema**:
- Imagens com dimensões diferentes de 1080×1920 não eram exibidas corretamente
- Imagens eram cortadas ou distorcidas

**Solução**:
- Implementação de um processador de imagens em `story-processor.js` que:
  - Cria um canvas branco com dimensões 1080×1920
  - Redimensiona proporcionalmente a imagem original
  - Centraliza a imagem redimensionada no canvas
  - Gera um novo arquivo com essa composição

### 4. Área de upload não totalmente clicável

**Problema**:
- Apenas o botão interno era clicável, não toda a área de upload
- Usuários tentavam clicar na área e nada acontecia

**Solução**:
- Criação de um novo arquivo `upload-area.js` que:
  - Torna toda a área de upload clicável
  - Muda o cursor para 'pointer' para indicar que a área é clicável
  - Verifica se o clique não foi em um botão (que já tem seu próprio evento)

## Estrutura de Armazenamento

O sistema armazena os arquivos em uma estrutura organizada:

```
/arquivos/[nome do cliente]/[tipo de arquivo]/[nome do arquivo]
```

Exemplo:
```
www.postar.com.br/adpeto/imagem/adpeto_MMDDYYYYHHMMSSMMMµµµ.jpg
```

## Funções Auxiliares

### getUploadPath()
- Gera o caminho de upload baseado no cliente e tipo de arquivo
- Retorna um array com o caminho do diretório e a URL pública

### generateUniqueFilename()
- Cria nomes de arquivos no formato solicitado com timestamp
- Garante que não haja conflitos de nomes

## Integração com o Sistema de Agendamento

O sistema de upload está integrado ao sistema de agendamento de postagens:

1. Os arquivos são enviados durante o preenchimento do formulário de agendamento
2. Os caminhos dos arquivos são armazenados temporariamente
3. Ao confirmar o agendamento, os caminhos são salvos no banco de dados
4. As URLs completas são enviadas para o webhook

## Recomendações para Melhorias Futuras

1. **Validação mais robusta de tipos de arquivo**:
   - Verificar o conteúdo real do arquivo, não apenas a extensão
   - Implementar verificações de segurança adicionais

2. **Otimização de imagens**:
   - Compressão automática de imagens para reduzir o tamanho
   - Conversão para formatos mais eficientes quando apropriado

3. **Melhor feedback de progresso**:
   - Implementar uma barra de progresso para uploads grandes
   - Fornecer estimativas de tempo restante

4. **Upload em segundo plano**:
   - Permitir que o usuário continue preenchendo o formulário enquanto os arquivos são enviados
   - Implementar um sistema de fila para uploads múltiplos

5. **Verificação de duplicatas**:
   - Detectar e alertar sobre uploads de arquivos idênticos
   - Opção para reutilizar arquivos já enviados
