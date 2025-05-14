/**
 * Script avançado para visualização prévia de uploads
 * Inclui recursos de arrastar e soltar, reordenação e progresso de upload
 */

document.addEventListener('DOMContentLoaded', function() {
    // Configuração de visualização prévia para upload único
    setupSingleFilePreview();
    
    // Configuração de visualização prévia para carrossel
    setupCarouselPreview();
    
    // Configuração de drag-and-drop para reordenação
    setupSortable();
    
    // Configuração de validação de formulário
    setupFormValidation();
});

/**
 * Configura a visualização prévia para upload de arquivo único
 */
function setupSingleFilePreview() {
    console.log('Configurando preview para upload único');
    const singleFileInput = document.getElementById('singleFile');
    const singlePreview = document.getElementById('singlePreview');
    
    if (!singleFileInput || !singlePreview) {
        console.error('Elementos necessários não encontrados:', { singleFileInput, singlePreview });
        return;
    }
    
    console.log('Elementos encontrados, adicionando listener');
    
    // Remover listeners anteriores
    const newInput = singleFileInput.cloneNode(true);
    if (singleFileInput.parentNode) {
        singleFileInput.parentNode.replaceChild(newInput, singleFileInput);
    }
    
    // Adicionar novo listener
    newInput.addEventListener('change', function() {
        console.log('Input de arquivo alterado, arquivos:', this.files);
        
        // Limpar visualização prévia anterior
        singlePreview.innerHTML = '';
        
        if (this.files && this.files.length > 0) {
            const file = this.files[0];
            console.log('Processando arquivo:', file.name);
            
            // Usar a função global createFilePreview
            if (typeof window.createFilePreview === 'function') {
                console.log('Chamando createFilePreview global');
                window.createFilePreview(file, singlePreview);
            } else {
                console.error('Função createFilePreview não encontrada no escopo global');
                // Fallback para exibição básica
                const errorMsg = document.createElement('div');
                errorMsg.className = 'alert alert-warning';
                errorMsg.textContent = 'Não foi possível criar a prévia do arquivo. Função createFilePreview não encontrada.';
                singlePreview.appendChild(errorMsg);
            }
        }
    });
}

/**
 * Configura a visualização prévia para upload de carrossel
 */
function setupCarouselPreview() {
    console.log('Configurando preview para carrossel');
    const carouselFilesInput = document.getElementById('carouselFiles');
    const carouselPreview = document.getElementById('carouselPreview');
    const carouselCounter = document.getElementById('carousel-counter');
    
    if (!carouselFilesInput || !carouselPreview) {
        console.error('Elementos necessários não encontrados:', { carouselFilesInput, carouselPreview });
        return;
    }
    
    console.log('Elementos encontrados, adicionando listener');
    
    // Remover listeners anteriores
    const newInput = carouselFilesInput.cloneNode(true);
    if (carouselFilesInput.parentNode) {
        carouselFilesInput.parentNode.replaceChild(newInput, carouselFilesInput);
    }
    
    // Armazenar arquivos selecionados
    let selectedFiles = [];
    
    newInput.addEventListener('change', function(e) {
        console.log('Input de carrossel alterado, arquivos:', this.files);
        
        // Obter novos arquivos
        const newFiles = Array.from(this.files);
        console.log('Novos arquivos:', newFiles.map(f => f.name));
        
        // Adicionar à lista de arquivos selecionados
        selectedFiles = selectedFiles.concat(newFiles);
        
        // Atualizar visualização
        updateCarouselPreview();
    });
    
    /**
     * Atualiza a visualização do carrossel
     */
    function updateCarouselPreview() {
        console.log('Atualizando visualização do carrossel, arquivos:', selectedFiles.length);
        
        // Limpar visualização prévia anterior
        carouselPreview.innerHTML = '';
        
        // Atualizar contador
        if (carouselCounter) {
            carouselCounter.textContent = selectedFiles.length;
            
            // Atualizar estilo do contador
            if (selectedFiles.length >= 10) {
                carouselCounter.className = 'badge bg-danger float-end';
            } else if (selectedFiles.length > 0) {
                carouselCounter.className = 'badge bg-light text-dark float-end';
            } else {
                carouselCounter.className = 'badge bg-light text-dark float-end';
            }
        }
        
        // Criar visualização para cada arquivo
        selectedFiles.forEach((file, index) => {
            console.log(`Processando arquivo ${index + 1}/${selectedFiles.length}:`, file.name);
            
            // Criar container de visualização
            const previewItem = document.createElement('div');
            previewItem.className = 'carousel-preview-item position-relative';
            previewItem.dataset.index = index;
            previewItem.style.width = '180px';
            previewItem.style.margin = '5px';
            
            // Criar container temporário para o preview
            const tempContainer = document.createElement('div');
            
            // Usar a função global createFilePreview
            if (typeof window.createFilePreview === 'function') {
                console.log('Chamando createFilePreview global para item de carrossel');
                window.createFilePreview(file, tempContainer);
                
                // Extrair o conteúdo de mídia do tempContainer
                const mediaElement = tempContainer.querySelector('img, video');
                if (mediaElement) {
                    // Criar container para mídia
                    const mediaContainer = document.createElement('div');
                    mediaContainer.className = 'media-container';
                    mediaContainer.style.width = '180px';
                    mediaContainer.style.height = '180px';
                    mediaContainer.style.overflow = 'hidden';
                    mediaContainer.style.borderRadius = '8px';
                    mediaContainer.style.backgroundColor = '#f8f9fa';
                    mediaContainer.style.display = 'flex';
                    mediaContainer.style.alignItems = 'center';
                    mediaContainer.style.justifyContent = 'center';
                    mediaContainer.style.position = 'relative';
                    
                    // Ajustar estilo do elemento de mídia
                    mediaElement.style.width = '100%';
                    mediaElement.style.height = '100%';
                    mediaElement.style.objectFit = 'cover';
                    
                    // Remover o elemento do container temporário e adicioná-lo ao container de mídia
                    tempContainer.removeChild(mediaElement);
                    mediaContainer.appendChild(mediaElement);
                    
                    // Adicionar número de ordem
                    const orderBadge = document.createElement('div');
                    orderBadge.className = 'order-badge position-absolute top-0 start-0 m-2 bg-primary text-white rounded-circle d-flex align-items-center justify-content-center';
                    orderBadge.style.width = '24px';
                    orderBadge.style.height = '24px';
                    orderBadge.style.fontSize = '12px';
                    orderBadge.textContent = index + 1;
                    mediaContainer.appendChild(orderBadge);
                    
                    previewItem.appendChild(mediaContainer);
                    
                    // Adicionar informações do arquivo
                    const fileInfo = document.createElement('div');
                    fileInfo.className = 'file-info mt-2 small text-center';
                    fileInfo.innerHTML = `
                        <div class="text-truncate" title="${file.name}" style="max-width: 180px;">${file.name}</div>
                        <div class="text-muted">${formatFileSize(file.size)}</div>
                    `;
                    previewItem.appendChild(fileInfo);
                    
                    // Adicionar botão para remover
                    const removeBtn = document.createElement('button');
                    removeBtn.type = 'button';
                    removeBtn.className = 'btn btn-danger btn-sm position-absolute top-0 end-0 m-1 rounded-circle';
                    removeBtn.innerHTML = '<i class="fas fa-times"></i>';
                    removeBtn.style.width = '24px';
                    removeBtn.style.height = '24px';
                    removeBtn.style.padding = '0';
                    removeBtn.style.display = 'flex';
                    removeBtn.style.alignItems = 'center';
                    removeBtn.style.justifyContent = 'center';
                    
                    removeBtn.addEventListener('click', function() {
                        // Remover arquivo da lista
                        selectedFiles.splice(index, 1);
                        
                        // Atualizar visualização
                        updateCarouselPreview();
                    });
                    
                    previewItem.appendChild(removeBtn);
                } else {
                    console.error('Não foi possível criar preview para o arquivo:', file.name);
                    previewItem.innerHTML = `<div class="alert alert-warning">Erro ao processar: ${file.name}</div>`;
                }
            } else {
                console.error('Função createFilePreview não encontrada no escopo global');
                previewItem.innerHTML = `<div class="alert alert-warning">Erro: função de preview não disponível</div>`;
            }
            
            // Adicionar ao container de visualização
            carouselPreview.appendChild(previewItem);
        });
        
        // Reinicializar Sortable após atualizar os itens
        if (typeof Sortable !== 'undefined') {
            initSortable();
        }
    }
    
    /**
     * Inicializa o Sortable para permitir reordenação
     */
    function initSortable() {
        if (carouselPreview && typeof Sortable !== 'undefined') {
            new Sortable(carouselPreview, {
                animation: 150,
                ghostClass: 'sortable-ghost',
                onEnd: function(evt) {
                    // Reordenar arquivos na lista
                    const item = selectedFiles[evt.oldIndex];
                    selectedFiles.splice(evt.oldIndex, 1);
                    selectedFiles.splice(evt.newIndex, 0, item);
                    
                    // Atualizar visualização
                    updateCarouselPreview();
                }
            });
        }
    }
}

/**
 * Configura o Sortable para permitir reordenação por arrastar e soltar
 */
function setupSortable() {
    const carouselPreview = document.getElementById('carouselPreview');
    
    if (carouselPreview && typeof Sortable !== 'undefined') {
        new Sortable(carouselPreview, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: function(evt) {
                // Atualizar números de ordem
                const items = carouselPreview.querySelectorAll('.carousel-preview-item');
                items.forEach((item, index) => {
                    const orderBadge = item.querySelector('.order-badge');
                    if (orderBadge) {
                        orderBadge.textContent = index + 1;
                    }
                });
            }
        });
    }
}

/**
 * Configura validação de formulário
 */
function setupFormValidation() {
    const postForm = document.getElementById('postForm');
    
    if (postForm) {
        postForm.addEventListener('submit', function(e) {
            const formato = document.getElementById('formato').value;
            const singleFileInput = document.getElementById('singleFile');
            const carouselFilesInput = document.getElementById('carouselFiles');
            
            // Verificar se há arquivos selecionados
            if ((formato === 'Imagem Única' || formato === 'Vídeo Único') && 
                (!singleFileInput.files || singleFileInput.files.length === 0)) {
                e.preventDefault();
                alert('Por favor, selecione um arquivo para upload.');
                return false;
            } else if (formato === 'Carrossel' && 
                       (!carouselFilesInput.files || carouselFilesInput.files.length === 0)) {
                e.preventDefault();
                alert('Por favor, selecione pelo menos um arquivo para o carrossel.');
                return false;
            }
            
            return true;
        });
    }
}

/**
 * Formata o tamanho do arquivo para exibição
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
