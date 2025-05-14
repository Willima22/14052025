/**
 * Implementação de interface para upload, visualização e ordenação de imagens em carrossel
 * Abordagem com caixinhas numeradas para evitar problemas de reordenação
 */

// Variáveis para armazenar as imagens
let carouselFiles = new Array(20).fill(null); // Array com posições fixas para os arquivos
const MAX_CAROUSEL_IMAGES = 20;
const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1GB em bytes

// Inicializar o componente quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
  initCarouselUpload();
});

// Inicializar o componente de upload de carrossel
function initCarouselUpload() {
  const container = document.getElementById('carousel-slots-container');
  if (!container) {
    console.error('Container de slots do carrossel não encontrado');
    return;
  }
  
  console.log('Inicializando interface de carrossel com slots fixos...');
  
  // Criar os slots numerados
  createImageSlots(container);
  
  // Inicializar os eventos de upload
  setupUploadEvents();
  
  // Atualizar contador inicial
  updateFileCounter();
}

// Criar os slots numerados para as imagens
function createImageSlots(container) {
  container.innerHTML = ''; // Limpar o container
  
  // Criar 20 slots numerados
  for (let i = 0; i < MAX_CAROUSEL_IMAGES; i++) {
    const slot = document.createElement('div');
    slot.className = 'carousel-slot';
    slot.dataset.position = i;
    
    // Conteúdo do slot
    slot.innerHTML = `
      <div class="slot-inner ${i === 0 ? 'is-cover' : ''}">
        <div class="slot-empty">
          <span class="position-number">${i + 1}</span>
          <i class="fas fa-plus"></i>
          ${i === 0 ? '<span class="cover-badge">CAPA</span>' : ''}
        </div>
        <div class="slot-preview d-none">
          <img src="" alt="Imagem ${i + 1}" class="preview-img">
          <div class="image-overlay">
            <span class="position-badge">${i + 1}</span>
            <button type="button" class="remove-image" data-position="${i}">✕</button>
            ${i === 0 ? '<span class="cover-badge">CAPA</span>' : ''}
          </div>
        </div>
        <input type="file" id="carouselFile${i}" name="carouselFiles[]" 
               class="file-upload d-none" accept="image/*" data-position="${i}">
      </div>
    `;
    
    container.appendChild(slot);
    
    // Adicionar evento de clique para selecionar arquivo
    const slotInner = slot.querySelector('.slot-inner');
    slotInner.addEventListener('click', function(e) {
      if (!e.target.closest('.remove-image')) {
        const input = slot.querySelector('input[type="file"]');
        input.click();
      }
    });
    
    // Adicionar evento para o input file
    const input = slot.querySelector('input[type="file"]');
    input.addEventListener('change', function() {
      if (this.files && this.files[0]) {
        handleFileSelect(this.files[0], parseInt(this.dataset.position));
      }
    });
    
    // Adicionar evento para o botão de remover
    const removeBtn = slot.querySelector('.remove-image');
    if (removeBtn) {
      removeBtn.addEventListener('click', function() {
        const position = parseInt(this.dataset.position);
        removeFile(position);
      });
    }
  }
}

// Processar arquivo selecionado
function handleFileSelect(file, position) {
  // Verificar se é uma imagem
  if (!file.type.match('image.*')) {
    showError(`O arquivo "${file.name}" não é uma imagem válida.`);
    return;
  }
  
  // Verificar o tamanho do arquivo
  if (file.size > MAX_FILE_SIZE) {
    showError(`A imagem "${file.name}" excede o tamanho máximo permitido (1GB).`);
    return;
  }
  
  // Armazenar o arquivo na posição específica
  carouselFiles[position] = file;
  
  // Criar preview usando URL.createObjectURL (mais rápido que FileReader)
  const objectUrl = URL.createObjectURL(file);
  updateSlotPreview(position, objectUrl, file.name);
  
  // Atualizar contador
  updateFileCounter();
}

// Atualizar o preview de um slot específico
function updateSlotPreview(position, imageUrl, fileName) {
  const slot = document.querySelector(`.carousel-slot[data-position="${position}"]`);
  if (!slot) return;
  
  const slotEmpty = slot.querySelector('.slot-empty');
  const slotPreview = slot.querySelector('.slot-preview');
  const previewImg = slot.querySelector('.preview-img');
  
  // Atualizar a imagem
  previewImg.src = imageUrl;
  previewImg.alt = fileName;
  
  // Mostrar o preview e esconder o placeholder
  slotEmpty.classList.add('d-none');
  slotPreview.classList.remove('d-none');
}

// Remover arquivo de uma posição
function removeFile(position) {
  // Remover o arquivo do array
  carouselFiles[position] = null;
  
  // Atualizar a interface
  const slot = document.querySelector(`.carousel-slot[data-position="${position}"]`);
  if (!slot) return;
  
  const slotEmpty = slot.querySelector('.slot-empty');
  const slotPreview = slot.querySelector('.slot-preview');
  
  // Mostrar o placeholder e esconder o preview
  slotEmpty.classList.remove('d-none');
  slotPreview.classList.add('d-none');
  
  // Resetar o input file
  const input = slot.querySelector('input[type="file"]');
  input.value = '';
  
  // Atualizar contador
  updateFileCounter();
}

// Configurar eventos de upload
function setupUploadEvents() {
  // Implementar drag and drop para cada slot individualmente se necessário
}

// Atualizar contador de arquivos
function updateFileCounter() {
  const counter = document.getElementById('carousel-counter');
  if (counter) {
    const fileCount = carouselFiles.filter(file => file !== null).length;
    counter.textContent = `${fileCount}/${MAX_CAROUSEL_IMAGES}`;
  }
}

// Validar envio do carrossel
function validateCarouselSubmission() {
  // Verificar número mínimo de imagens
  const fileCount = carouselFiles.filter(file => file !== null).length;
  
  if (fileCount < 2) {
    showError('Um carrossel precisa ter pelo menos 2 imagens.');
    return false;
  }
  
  // Verificar se a primeira posição (capa) tem uma imagem
  if (!carouselFiles[0]) {
    showError('A primeira posição (capa) precisa ter uma imagem.');
    return false;
  }
  
  return true;
}

// Preparar dados para envio
function prepareFilesForSubmission() {
  // Filtrar arquivos nulos e criar um FormData
  const formData = new FormData();
  const files = carouselFiles.filter(file => file !== null);
  
  files.forEach((file, index) => {
    formData.append(`carouselFiles[${index}]`, file);
  });
  
  return formData;
}

// Mostrar mensagem de erro
function showError(message) {
  // Criar elemento de toast
  const toast = document.createElement('div');
  toast.className = 'toast toast-error';
  toast.innerHTML = `
    <div class="toast-content">
      <i class="fas fa-exclamation-circle"></i>
      <span>${message}</span>
    </div>
  `;
  
  // Adicionar ao corpo do documento
  document.body.appendChild(toast);
  
  // Mostrar o toast
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  // Remover após 5 segundos
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 5000);
}

// Mostrar indicador de carregamento
function showLoading(message = 'Carregando...') {
  // Remover qualquer indicador existente
  hideLoading();
  
  // Criar o overlay de carregamento
  const loadingOverlay = document.createElement('div');
  loadingOverlay.id = 'loading-overlay';
  loadingOverlay.className = 'loading-overlay';
  loadingOverlay.innerHTML = `
    <div class="loading-spinner">
      <div class="spinner"></div>
      <p class="loading-message">${message}</p>
    </div>
  `;
  
  // Adicionar ao corpo do documento
  document.body.appendChild(loadingOverlay);
  
  // Mostrar o overlay
  setTimeout(() => {
    loadingOverlay.classList.add('show');
  }, 10);
}

// Esconder indicador de carregamento
function hideLoading() {
  const existingOverlay = document.getElementById('loading-overlay');
  if (existingOverlay) {
    existingOverlay.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(existingOverlay);
    }, 300);
  }
}

// Mostrar mensagem de sucesso
function showSuccess(message) {
  // Criar elemento de toast
  const toast = document.createElement('div');
  toast.className = 'toast toast-success';
  toast.innerHTML = `
    <div class="toast-content">
      <i class="fas fa-check-circle"></i>
      <span>${message}</span>
    </div>
  `;
  
  // Adicionar ao corpo do documento
  document.body.appendChild(toast);
  
  // Mostrar o toast
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  // Remover após 5 segundos
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 5000);
}

// Adicionar validação ao formulário
document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('postForm');
  if (form) {
    form.addEventListener('submit', function(e) {
      // Se o formato selecionado for carrossel, validar
      const formatoSelect = document.getElementById('formato');
      if (formatoSelect && formatoSelect.value === 'Carrossel') {
        if (!validateCarouselSubmission()) {
          e.preventDefault();
          return;
        }
        
        // Mostrar indicador de carregamento
        showLoading('Enviando imagens...');
        
        // Importante: Usar o FormData diretamente para envio mais rápido
        e.preventDefault(); // Impedir o envio normal do formulário
        
        // Criar um FormData com todos os dados do formulário
        const formData = new FormData(form);
        
        // Remover os arquivos existentes do FormData (para evitar duplicação)
        for (let i = 0; i < 20; i++) {
          formData.delete(`carouselFile${i}`);
        }
        
        // Adicionar apenas os arquivos não nulos ao FormData
        const files = carouselFiles.filter(file => file !== null);
        files.forEach((file, index) => {
          formData.append(`carouselFiles[]`, file);
        });
        
        // Usar fetch para enviar os dados (mais rápido que criar um formulário temporário)
        fetch(form.action, {
          method: 'POST',
          body: formData,
          // Não definir Content-Type, o navegador fará isso automaticamente com o boundary correto
        })
        .then(response => {
          if (!response.ok) {
            throw new Error('Erro ao enviar o formulário');
          }
          return response.text();
        })
        .then(html => {
          // Redirecionar para a página de resposta
          document.open();
          document.write(html);
          document.close();
        })
        .catch(error => {
          hideLoading();
          showError('Erro ao enviar o formulário: ' + error.message);
        });
      }
    });
  }
});
