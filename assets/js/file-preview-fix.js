/**
 * Script de correção para visualização prévia de arquivos
 * Resolve conflitos e garante que a função createFilePreview esteja no escopo global
 */

// Imediatamente expor a função createFilePreview para o escopo global
window.createFilePreview = function(file, container) {
    if (!file || !container) {
        console.error('Arquivo ou container inválido para preview');
        return;
    }
    
    console.log('Criando preview para:', file.name);
    
    // Criar card para o arquivo
    const card = document.createElement('div');
    card.className = 'card mb-3';
    card.style.maxWidth = '1080px';
    card.style.margin = '0 auto';
    
    // Criar container para a imagem com tamanho fixo
    const imageContainer = document.createElement('div');
    imageContainer.className = 'image-container';
    imageContainer.style.position = 'relative';
    imageContainer.style.height = '200px';
    imageContainer.style.overflow = 'hidden';
    imageContainer.style.display = 'flex';
    imageContainer.style.justifyContent = 'center';
    imageContainer.style.alignItems = 'center';
    imageContainer.style.backgroundColor = '#f8f9fa';
    
    // Botão de remoção
    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn btn-danger position-absolute top-0 end-0 m-2 rounded-circle';
    removeBtn.innerHTML = '<i class="fas fa-times"></i>';
    removeBtn.style.width = '30px';
    removeBtn.style.height = '30px';
    removeBtn.style.padding = '0';
    removeBtn.style.zIndex = '10';
    removeBtn.addEventListener('click', function() {
        card.remove();
        
        // Atualizar contador de arquivos para carrossel, se aplicável
        const carouselCounter = document.getElementById('carousel-counter');
        if (carouselCounter && container.id === 'carouselPreview') {
            const currentCount = container.querySelectorAll('.card').length;
            carouselCounter.textContent = `${currentCount}/20`;
        }
        
        // Limpar o valor do input de arquivo no caso de remoção
        if (container.id === 'singlePreview') {
            const fileInput = document.getElementById('singleFile');
            if (fileInput) {
                try {
                    fileInput.value = '';
                } catch (e) {
                    console.warn('Erro ao limpar input de arquivo:', e);
                }
            }
        }
    });
    
    // Adicionar botão ao container
    imageContainer.appendChild(removeBtn);
    
    // Processar o arquivo
    const reader = new FileReader();
    reader.onload = function(e) {
        if (file.type.startsWith('image/')) {
            // Criar elemento de imagem
            const img = document.createElement('img');
            img.src = e.target.result;
            img.alt = file.name;
            img.className = 'card-img-top';
            img.style.maxHeight = '100%';
            img.style.width = 'auto';
            img.style.objectFit = 'contain';
            imageContainer.appendChild(img);
        } else if (file.type.startsWith('video/')) {
            // Criar elemento de vídeo
            const videoContainer = document.createElement('div');
            videoContainer.className = 'd-flex justify-content-center align-items-center h-100';
            
            const videoIcon = document.createElement('div');
            videoIcon.className = 'text-center';
            videoIcon.innerHTML = `
                <i class="fas fa-video fa-3x text-secondary mb-2"></i>
                <p class="mb-0">Vídeo</p>
            `;
            
            videoContainer.appendChild(videoIcon);
            imageContainer.appendChild(videoContainer);
        } else {
            // Criar ícone para outros tipos de arquivo
            const fileIcon = document.createElement('div');
            fileIcon.className = 'd-flex justify-content-center align-items-center h-100';
            fileIcon.innerHTML = `
                <div class="text-center">
                    <i class="fas fa-file fa-3x text-secondary mb-2"></i>
                    <p class="mb-0">Arquivo</p>
                </div>
            `;
            imageContainer.appendChild(fileIcon);
        }
        
        // Adicionar container de imagem ao card
        card.appendChild(imageContainer);
        
        // Adicionar informações do arquivo
        const cardBody = document.createElement('div');
        cardBody.className = 'card-body p-2';
        cardBody.innerHTML = `
            <p class="card-text mb-0">
                <small class="text-muted">${file.name}</small>
            </p>
            <p class="card-text">
                <small class="text-muted">${formatFileSize(file.size)}</small>
            </p>
        `;
        
        card.appendChild(cardBody);
        
        // Adicionar card ao container
        container.appendChild(card);
        
        console.log('Preview criado com sucesso para:', file.name);
    };
    
    // Tratar erros no FileReader
    reader.onerror = function(error) {
        console.error('Erro ao ler arquivo:', error);
        
        // Criar mensagem de erro
        const errorAlert = document.createElement('div');
        errorAlert.className = 'alert alert-danger';
        errorAlert.textContent = 'Erro ao processar o arquivo: ' + file.name;
        container.appendChild(errorAlert);
    };
    
    // Iniciar leitura do arquivo
    try {
        reader.readAsDataURL(file);
    } catch (error) {
        console.error('Erro ao iniciar leitura do arquivo:', error);
    }
    
    return card;
};

// Função auxiliar para formatar tamanho do arquivo
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Garantir que os seletores de arquivo estejam configurados corretamente
document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando correção de preview de arquivos...');
    
    // Configurar todos os botões de seleção de arquivo
    document.querySelectorAll('.select-file-btn').forEach(function(btn) {
        if (!btn) return;
        
        // Remover eventos anteriores
        const newBtn = btn.cloneNode(true);
        if (btn.parentNode) {
            btn.parentNode.replaceChild(newBtn, btn);
        }
        
        // Adicionar evento de clique
        newBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const targetId = this.getAttribute('data-target');
            if (targetId) {
                const fileInput = document.getElementById(targetId);
                if (fileInput) {
                    fileInput.click();
                }
            }
        });
    });
    
    // Configurar inputs de arquivo
    document.querySelectorAll('.file-upload').forEach(function(input) {
        if (!input) return;
        
        // Remover eventos anteriores
        const newInput = input.cloneNode(true);
        if (input.parentNode) {
            input.parentNode.replaceChild(newInput, input);
        }
        
        // Adicionar evento de mudança
        newInput.addEventListener('change', function() {
            if (!this.files || this.files.length === 0) return;
            
            const previewId = this.getAttribute('data-preview');
            const previewContainer = document.getElementById(previewId);
            
            if (previewContainer) {
                // Limpar preview anterior para upload único
                if (!this.multiple) {
                    previewContainer.innerHTML = '';
                }
                
                // Atualizar contador para carrossel
                if (previewId === 'carouselPreview') {
                    const counter = document.getElementById('carousel-counter');
                    if (counter) {
                        const currentCount = previewContainer.querySelectorAll('.card').length;
                        const newCount = currentCount + this.files.length;
                        counter.textContent = `${newCount}/20`;
                    }
                }
                
                // Criar preview para cada arquivo
                for (let i = 0; i < this.files.length; i++) {
                    createFilePreview(this.files[i], previewContainer);
                }
            }
        });
    });
    
    // Configurar áreas de upload para drag & drop
    document.querySelectorAll('.upload-area').forEach(function(area) {
        if (!area) return;
        
        // Remover eventos anteriores
        const newArea = area.cloneNode(true);
        if (area.parentNode) {
            area.parentNode.replaceChild(newArea, area);
        }
        
        // Reconfigurar o botão interno
        const btn = newArea.querySelector('.select-file-btn');
        if (btn) {
            const targetId = btn.getAttribute('data-target');
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                if (targetId) {
                    const fileInput = document.getElementById(targetId);
                    if (fileInput) {
                        fileInput.click();
                    }
                }
            });
        }
        
        // Eventos de drag & drop
        newArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('dragover');
        });
        
        newArea.addEventListener('dragleave', function() {
            this.classList.remove('dragover');
        });
        
        newArea.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('dragover');
            
            const btn = this.querySelector('.select-file-btn');
            if (!btn) return;
            
            const targetId = btn.getAttribute('data-target');
            if (!targetId) return;
            
            const fileInput = document.getElementById(targetId);
            if (!fileInput) return;
            
            // Transferir arquivos para o input
            try {
                if (e.dataTransfer.files.length > 0) {
                    if (fileInput.multiple) {
                        fileInput.files = e.dataTransfer.files;
                    } else {
                        // Para upload único, usar apenas o primeiro arquivo
                        const dt = new DataTransfer();
                        dt.items.add(e.dataTransfer.files[0]);
                        fileInput.files = dt.files;
                    }
                    
                    // Disparar evento de mudança
                    const event = new Event('change');
                    fileInput.dispatchEvent(event);
                }
            } catch (error) {
                console.error('Erro ao processar arquivos arrastados:', error);
            }
        });
    });
    
    console.log('Correção de preview de arquivos inicializada com sucesso!');
});

// Adicionar CSS para melhorar a interface
const style = document.createElement('style');
style.textContent = `
    .upload-area {
        transition: all 0.3s ease;
        border: 2px dashed #dee2e6;
        border-radius: 0.25rem;
    }
    
    .upload-area.dragover {
        border-color: #0d6efd;
        background-color: rgba(13, 110, 253, 0.05);
    }
    
    .image-container {
        border-top-left-radius: calc(0.25rem - 1px);
        border-top-right-radius: calc(0.25rem - 1px);
    }
`;
document.head.appendChild(style);
