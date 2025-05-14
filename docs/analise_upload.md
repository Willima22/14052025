# Análise do Sistema de Upload de Arquivos

## Visão Geral

Este documento analisa o sistema de upload de arquivos implementado na página `index.php`, focando especificamente nos três tipos de upload:

1. Upload Simples (Feed) - Imagem ou Vídeo Único
2. Upload para Stories - Imagens processadas para formato 1080×1920
3. Upload de Carrossel - Múltiplas imagens

## Arquivos Relacionados

### Arquivos HTML/PHP
- `index.php` - Formulário principal com os campos de upload
- `processar_formulario.php` - Processa os dados do formulário e uploads
- `confirmar_postagem.php` - Página de confirmação após o upload

### Arquivos JavaScript
- `upload-fix.js` - Script principal para corrigir problemas de upload
- `upload-feedback.js` - Fornece feedback visual durante o upload
- `story-upload-handler.js` - Gerencia uploads específicos para Stories
- `story-processor.js` - Processa imagens para o formato de Stories
- `carousel-upload.js` - Gerencia uploads de carrossel

### Arquivos CSS
- `upload-feedback.css` - Estilos para feedback de upload

## Fluxo de Upload

### 1. Upload Simples (Feed)

**HTML:**
```html
<div id="single-upload-container" class="mb-4">
    <div class="upload-area p-4 text-center border border-2 border-dashed rounded drag-drop-enabled">
        <div class="mb-3">
            <i class="fas fa-cloud-upload-alt fa-3x text-primary upload-icon"></i>
        </div>
        <h5 class="mb-2">Clique ou arraste um arquivo</h5>
        <p class="text-muted mb-1">Formatos suportados: JPG, PNG, GIF, MP4, MOV</p>
        <p class="text-muted mb-3">Tamanho máximo: 1GB</p>
        <button type="button" class="btn btn-outline-primary select-file-btn" data-target="singleFile">
            <i class="fas fa-folder-open me-2"></i>Selecionar arquivo
        </button>
        <input type="file" id="singleFile" name="singleFile" class="file-upload d-none" data-preview="singlePreview" accept="image/jpeg,image/png,image/gif,video/mp4,video/mov,video/avi">
        <div class="upload-progress-indicator"></div>
        <div class="drag-feedback">Solte o arquivo aqui</div>
    </div>
    <div id="singlePreview" class="mt-3 upload-preview"></div>
</div>
```

**Fluxo:**
1. Usuário clica no botão "Selecionar arquivo" ou arrasta um arquivo para a área
2. O arquivo é selecionado através do input `singleFile`
3. O preview é exibido na div `singlePreview`
4. Ao enviar o formulário, o arquivo é processado em `processar_formulario.php`

### 2. Upload para Stories

**HTML:**
```html
<div id="story-upload-container" class="mb-4 d-none story-upload-container">
    <div class="story-info-box">
        <i class="fas fa-info-circle"></i>
        <div>Imagens para Stories serão automaticamente ajustadas para o formato 1080×1920 com fundo branco quando necessário.</div>
    </div>
    
    <div class="story-upload-area drag-drop-enabled">
        <div class="mb-3">
            <i class="fas fa-mobile-alt fa-3x upload-icon"></i>
        </div>
        <h5 class="mb-2">Clique ou arraste uma imagem para Stories</h5>
        <p class="text-muted mb-1">Formatos suportados: JPG, PNG, GIF</p>
        <p class="text-muted mb-3">Tamanho máximo: 1GB</p>
        <button type="button" class="btn btn-outline-primary select-file-btn" data-target="story-image-input">
            <i class="fas fa-folder-open me-2"></i>Selecionar imagem
        </button>
        <input type="file" id="story-image-input" name="storyFile" class="file-upload d-none" accept="image/jpeg,image/png,image/gif" data-dimensions="1080x1920">
        <div class="upload-progress-indicator"></div>
        <div class="drag-feedback">Solte a imagem aqui</div>
    </div>
    
    <div class="story-preview-container">
        <div class="story-preview-wrapper d-none">
            <img id="story-image-preview" src="" alt="Preview do Story" class="story-preview-img">
            <div class="story-dimensions-badge">1080×1920</div>
            <button type="button" class="story-remove-btn">✕</button>
        </div>
    </div>
</div>
```

**Fluxo:**
1. Este container é mostrado apenas quando o tipo de postagem é "Stories" ou "Feed e Stories"
2. Usuário clica no botão "Selecionar imagem" ou arrasta uma imagem para a área
3. A imagem é selecionada através do input `story-image-input`
4. A imagem é processada pelo `story-processor.js` para o formato 1080×1920
5. O preview é exibido na div `story-preview-wrapper`
6. Ao enviar o formulário, a imagem processada é enviada em `processar_formulario.php`

### 3. Upload de Carrossel

**HTML:**
```html
<div id="carousel-upload-container" class="mb-4 d-none carousel-upload-container">
    <div class="carousel-preview-container">
        <h4>
            Carrossel de Imagens
            <span class="carousel-counter" id="carousel-counter">0/20</span>
        </h4>
        
        <div class="alert alert-info mb-3 d-flex align-items-center" role="alert">
            <i class="fas fa-info-circle me-2"></i>
            <div>Clique ou arraste imagens para cada posição. A primeira imagem será a capa do carrossel.</div>
        </div>
        
        <!-- Área de slots para upload -->
        <div id="carousel-slots-container" class="carousel-slots-container">
            <!-- Os slots serão gerados pelo JavaScript -->
        </div>
        
        <!-- Input oculto para armazenar os arquivos do carrossel -->
        <input type="file" id="carouselFiles" name="carouselFiles[]" class="d-none" multiple accept="image/jpeg,image/png,image/gif,image/webp">
    </div>
</div>
```

**Fluxo:**
1. Este container é mostrado apenas quando o formato selecionado é "Carrossel"
2. Os slots para upload são gerados dinamicamente pelo `carousel-upload.js`
3. Usuário pode adicionar até 20 imagens, arrastando ou clicando nos slots
4. As imagens são armazenadas no input `carouselFiles[]`
5. O contador de imagens é atualizado em tempo real
6. Ao enviar o formulário, as imagens são processadas em `processar_formulario.php`

## Problemas Identificados e Correções

### Problema 1: Upload de Feed requer dois cliques
- **Causa**: Conflitos entre diferentes scripts de manipulação de upload
- **Solução**: Implementação de `upload-fix.js` que limpa todos os event listeners anteriores e adiciona novos de forma mais robusta

### Problema 2: Upload de Stories não funciona corretamente
- **Causa**: Referências diretas a elementos DOM que podem estar desatualizadas
- **Solução**: 
  - Substituição de referências diretas por seletores que buscam os elementos no momento da execução
  - Melhoria no feedback visual (esconder área de upload quando preview estiver visível)
  - Implementação de toast de confirmação específico para Stories
  - Correção do processador de imagens

## Fluxo de Processamento no Backend

1. Formulário em `index.php` é enviado para `processar_formulario.php`
2. `processar_formulario.php` valida os dados e processa os uploads:
   - Determina o tipo de arquivo (imagem ou vídeo)
   - Gera nomes de arquivo únicos
   - Move os arquivos para os diretórios corretos
   - Armazena os dados na sessão
3. Redireciona para `confirmar_postagem.php` que exibe os dados para confirmação
4. Após confirmação, os dados são salvos no banco de dados

## Estrutura de Diretórios para Upload

Os arquivos são organizados seguindo a estrutura:
```
/arquivos/[nome do cliente]/[tipo de arquivo]/[nome do arquivo]
```

Onde:
- `[nome do cliente]` é o slug do nome do cliente
- `[tipo de arquivo]` pode ser "feed", "stories", "carrossel", etc.
- `[nome do arquivo]` segue o formato: `[tipo]_[cliente]_[YYYYMMDDHHMMSSFFF].[extensao]`
