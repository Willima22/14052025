/**
 * Implementação de interface para upload, visualização e ordenação de imagens em carrossel
 * Permite arrastar e soltar imagens, reordenar e enviar para agendamento
 */

// Variáveis para armazenar as imagens
let carouselImages = [];
let fileObjects = []; // Para armazenar objetos File
let fileUrls = []; // Para armazenar as URLs das imagens
let sortableInstance = null;

// Tamanho máximo de arquivo (1GB em bytes)
const MAX_FILE_SIZE = 1024 * 1024 * 1024;

// Número máximo de imagens permitido
const MAX_CAROUSEL_IMAGES = 20;

// Inicializar o componente de arrastar e soltar
document.addEventListener('DOMContentLoaded', function() {
  const uploadInput = document.getElementById('carouselFiles');
  const dropArea = document.querySelector('.carousel-upload-area');
  const previewContainer = document.getElementById('sortable-images');
  
  // Se os elementos não existirem, não prosseguir
  if (!uploadInput || !dropArea || !previewContainer) {
    console.warn('Elementos necessários para o carrossel não encontrados');
    return;
  }
  
  console.log('Inicializando interface de carrossel...');
  
  // Eventos de arrastar e soltar
  dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropArea.classList.add('active');
  });
  
  dropArea.addEventListener('dragleave', () => {
    dropArea.classList.remove('active');
  });
  
  dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dropArea.classList.remove('active');
    
    if (e.dataTransfer.files.length) {
      handleFiles(e.dataTransfer.files);
    }
  });
  
  // Upload via input file
  uploadInput.addEventListener('change', () => {
    if (uploadInput.files.length) {
      handleFiles(uploadInput.files);
    }
  });
  
  // Processar arquivos carregados
  function handleFiles(files) {
    // Verificar o número máximo de arquivos
    if (fileObjects.length + files.length > MAX_CAROUSEL_IMAGES) {
      showError(`Você pode carregar no máximo ${MAX_CAROUSEL_IMAGES} imagens.`);
      return;
    }
    
    Array.from(files).forEach(file => {
      // Verificar se é uma imagem (não aceitar vídeos)
      if (!file.type.match('image.*')) {
        showError(`O arquivo "${file.name}" não é uma imagem válida.`);
        return;
      }
      
      // Verificar o tamanho do arquivo (limite: 1GB)
      if (file.size > MAX_FILE_SIZE) {
        showError(`O arquivo "${file.name}" excede o tamanho máximo permitido (1GB).`);
        return;
      }
      
      // Armazenar o objeto File
      fileObjects.push(file);
      
      // Criar preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const fileUrl = e.target.result;
        // Armazenar a URL da imagem/vídeo
        fileUrls.push(fileUrl);
        
        // Adicionar preview com o índice correto
        const newIndex = fileObjects.length - 1;
        addImagePreview(file, fileUrl, newIndex);
      };
      reader.readAsDataURL(file);
    });
    
    // Atualizar contador de arquivos
    updateFileCounter();
  }
  
  // Adicionar preview com funcionalidade de remoção
  function addImagePreview(file, fileUrl, index) {
    const imageItem = document.createElement('div');
    imageItem.className = 'image-item';
    imageItem.dataset.index = index;
    
    // ID único para cada item - usar timestamp + random para garantir unicidade absoluta
    const uniqueId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${index}`;
    imageItem.dataset.fileId = uniqueId;
    
    // Guardar uma referência ao fileUrl no elemento para debugging
    imageItem.dataset.fileUrl = fileUrl.substring(0, 20) + '...'; // Versão curta para debug
    
    // Criar conteúdo HTML para imagem
    imageItem.innerHTML = `
      <img src="${fileUrl}" alt="Imagem ${index + 1}" class="preview-media">
      <div class="image-overlay">
        <span class="position-badge">${index + 1}</span>
        <button type="button" class="remove-image" data-index="${index}">✕</button>
      </div>
      <div class="media-type-badge image"><i class="fas fa-image"></i></div>
    `;
    
    // Adicionar evento para remover imagem
    imageItem.querySelector('.remove-image').addEventListener('click', function() {
      const indexToRemove = parseInt(this.dataset.index);
      fileObjects.splice(indexToRemove, 1);
      updateImagePreviews(); // Atualiza a visualização completa
    });
    
    previewContainer.appendChild(imageItem);
    
    // Inicializar/atualizar o sortable
    initSortable();
  }
  
  // Atualizar previews após remoção
  function updateImagePreviews() {
    previewContainer.innerHTML = '';
    fileUrls = []; // Limpar as URLs armazenadas
    
    fileObjects.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const fileUrl = e.target.result;
        fileUrls.push(fileUrl);
        addImagePreview(file, fileUrl, index);
      };
      reader.readAsDataURL(file);
    });
    
    // Atualizar contador de arquivos
    updateFileCounter();
  }
  
  // Inicializar o sortable
  function initSortable() {
    if (window.Sortable) {
      // Sempre destruir a instância anterior para evitar problemas
      if (sortableInstance) {
        sortableInstance.destroy();
      }
      
      // Obter o container
      const container = document.getElementById('sortable-images');
      if (!container) {
        console.error('Container de imagens não encontrado');
        return;
      }
      
      // Inicializar o Sortable com opções mais robustas
      sortableInstance = new Sortable(container, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        dragClass: 'sortable-drag',
        // Forçar o uso do ID personalizado
        dataIdAttr: 'data-file-id',
        // Desativar o comportamento padrão de arrastar do navegador
        preventOnFilter: true,
        // Melhorar a detecção de toque em dispositivos móveis
        touchStartThreshold: 3,
        // Usar uma função de comparação personalizada
        onMove: function(evt) {
          return true; // Sempre permitir movimento
        },
        onEnd: function(evt) {
          console.log('Sortable onEnd', evt.oldIndex, evt.newIndex);
          
          try {
            // 1) Reordenar os arrays de forma segura
            if (evt.oldIndex === evt.newIndex) {
              console.log('Nenhuma mudança na ordem');
              return; // Nada mudou
            }
            
            // Criar cópias dos arrays
            const newFileOrder = [...fileObjects];
            const newUrlOrder = [...fileUrls];
            
            // Mover os itens
            const movedFile = newFileOrder.splice(evt.oldIndex, 1)[0];
            const movedUrl = newUrlOrder.splice(evt.oldIndex, 1)[0];
            
            if (!movedFile || !movedUrl) {
              console.error('Erro ao mover item: item não encontrado');
              return;
            }
            
            newFileOrder.splice(evt.newIndex, 0, movedFile);
            newUrlOrder.splice(evt.newIndex, 0, movedUrl);
            
            // Atualizar as variáveis globais
            fileObjects = newFileOrder;
            fileUrls = newUrlOrder;
            
            // 2) Atualizar TODAS as imagens no DOM para garantir sincronização
            updateAllImageSources();
            
            // 3) Atualizar badges e botões
            updatePositionBadges();
            
            console.log('Reordenação concluída com sucesso');
          } catch (error) {
            console.error('Erro durante a reordenação:', error);
            // Em caso de erro, atualizar tudo para garantir consistência
            updateImagePreviews();
          }
        }
      });
    } else {
      console.error('Sortable.js não encontrado. Certifique-se de incluir a biblioteca.');
    }
  }
  
  // Atualizar apenas os badges de posição após reordenação
  function updatePositionBadges() {
    const items = document.querySelectorAll('.image-item');
    items.forEach((item, index) => {
      // Atualizar o índice do item
      item.dataset.index = index;
      
      // Atualizar o badge de posição
      const badge = item.querySelector('.position-badge');
      if (badge) {
        badge.textContent = index + 1;
      }
      
      // Atualizar o botão de remoção
      const removeButton = item.querySelector('.remove-image');
      if (removeButton) {
        removeButton.dataset.index = index;
      }
    });
  }
  
  // Função para atualizar todas as fontes de imagem
  function updateAllImageSources() {
    const items = document.querySelectorAll('.image-item');
    if (items.length !== fileUrls.length) {
      console.error(`Número de itens (${items.length}) diferente do número de URLs (${fileUrls.length})`);
    }
    
    items.forEach((item, index) => {
      if (index < fileUrls.length) {
        const img = item.querySelector('.preview-media');
        if (img) {
          // Guardar o src antigo para debug
          const oldSrc = img.src;
          // Definir o novo src
          img.src = fileUrls[index];
          
          // Verificar se houve mudança
          if (oldSrc !== fileUrls[index]) {
            console.log(`Imagem ${index + 1} atualizada:`, oldSrc.substring(0, 30) + '... -> ' + fileUrls[index].substring(0, 30) + '...');
          }
        }
      }
    });
  }
  
  // Atualizar contador de arquivos
  function updateFileCounter() {
    const counter = document.getElementById('carousel-counter');
    if (counter) {
      counter.textContent = `${fileObjects.length}/${MAX_CAROUSEL_IMAGES}`;
    }
  }
  
  // Validar envio do carrossel
  function validateCarouselSubmission() {
    // Verificar número mínimo de imagens
    if (fileObjects.length < 2) {
      showError('Um carrossel precisa ter pelo menos 2 imagens.');
      return false;
    }
    
    // Verificar número máximo de imagens
    if (fileObjects.length > MAX_CAROUSEL_IMAGES) {
      showError(`O carrossel suporta até ${MAX_CAROUSEL_IMAGES} imagens.`);
      return false;
    }
    
    return true;
  }
  
  // Adicionar validação ao formulário
  const form = document.getElementById('postForm');
  if (form) {
    form.addEventListener('submit', function(e) {
      // Se o formato selecionado for carrossel, validar
      const formatoSelect = document.getElementById('formato');
      if (formatoSelect && formatoSelect.value === 'Carrossel') {
        if (!validateCarouselSubmission()) {
          e.preventDefault();
        }
      }
    });
  }
  
  // Melhorar acessibilidade
  enhanceAccessibility();
});

// Funções de feedback ao usuário
function showError(message) {
  // Verificar se já existe um toast
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  // Criar elemento de toast
  const toast = document.createElement('div');
  toast.className = 'toast toast-error';
  toast.innerHTML = `
    <div class="toast-content">
      <i class="fas fa-exclamation-circle"></i>
      <span>${message}</span>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  // Mostrar o toast
  setTimeout(() => {
    toast.classList.add('show');
  }, 100);
  
  // Remover o toast após 5 segundos
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 5000);
}

function showSuccess(message) {
  // Verificar se já existe um toast
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  // Criar elemento de toast
  const toast = document.createElement('div');
  toast.className = 'toast toast-success';
  toast.innerHTML = `
    <div class="toast-content">
      <i class="fas fa-check-circle"></i>
      <span>${message}</span>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  // Mostrar o toast
  setTimeout(() => {
    toast.classList.add('show');
  }, 100);
  
  // Remover o toast após 3 segundos
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}

// Melhorar acessibilidade
function enhanceAccessibility() {
  const sortable = document.getElementById('sortable-images');
  if (!sortable) return;
  
  sortable.setAttribute('role', 'list');
  sortable.setAttribute('aria-label', 'Lista de imagens do carrossel, arraste para reordenar');
  
  // Adicione instruções para leitores de tela
  const instructionsEl = document.createElement('p');
  instructionsEl.className = 'sr-only'; // Apenas para leitores de tela
  instructionsEl.textContent = 'Arraste as imagens para reordenar. Use a tecla Tab para navegar entre as imagens e Enter para selecionar.';
  sortable.parentNode.insertBefore(instructionsEl, sortable);
}
