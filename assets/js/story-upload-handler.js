/**
 * Manipulador de upload para Stories
 * 
 * Gerencia a interface de upload para Stories e integra com o processador de imagens
 */

document.addEventListener('DOMContentLoaded', function() {
  // Verificar se o tipo de postagem é Stories ou Feed e Stories
  const tipoPostagemOptions = document.querySelectorAll('.post-type-option');
  const formatoOptions = document.querySelectorAll('.format-option');
  
  // Container de upload de Stories
  const storyUploadContainer = document.getElementById('story-upload-container');
  
  if (!tipoPostagemOptions.length || !storyUploadContainer) {
    return; // Elementos necessários não encontrados
  }
  
  console.log('Inicializando manipulador de upload para Stories...');
  
  // Referência para o container de upload padrão (single upload)
  const singleUploadArea = document.querySelector('.upload-area');
  
  // Função para mostrar/esconder o container de Stories
  function toggleStoryUpload() {
    const tipoPostagem = document.getElementById('tipo_postagem').value;
    const formato = document.getElementById('formato').value;
    
    // Mostrar o container de Stories apenas se o tipo for Stories ou Feed e Stories
    if (tipoPostagem === 'Stories' || tipoPostagem === 'Feed e Stories') {
      storyUploadContainer.classList.remove('d-none');
      
      // Se for apenas Stories (não Feed e Stories), esconder a área de upload padrão
      if (tipoPostagem === 'Stories' && singleUploadArea) {
        singleUploadArea.classList.add('d-none');
        
        // Tornar o campo singleFile não obrigatório
        const singleFileInput = document.getElementById('singleFile');
        if (singleFileInput) {
          singleFileInput.removeAttribute('required');
        }
      }
    } else {
      storyUploadContainer.classList.add('d-none');
      
      // Mostrar a área de upload padrão para outros tipos de postagem
      if (singleUploadArea) {
        singleUploadArea.classList.remove('d-none');
        
        // Restaurar o atributo required se necessário
        const singleFileInput = document.getElementById('singleFile');
        if (singleFileInput) {
          singleFileInput.setAttribute('required', 'required');
        }
      }
    }
  }
  
  // Adicionar eventos aos botões de tipo de postagem
  tipoPostagemOptions.forEach(option => {
    option.addEventListener('click', function() {
      // Atualizar o valor do input hidden
      document.getElementById('tipo_postagem').value = this.getAttribute('data-value');
      
      // Atualizar a interface
      toggleStoryUpload();
    });
  });
  
  // Adicionar eventos aos botões de formato
  formatoOptions.forEach(option => {
    option.addEventListener('click', function() {
      // Atualizar a interface
      toggleStoryUpload();
    });
  });
  
  // Configurar drag and drop para o upload de Stories
  const storyUploadArea = document.querySelector('.story-upload-area');
  const storyFileInput = document.getElementById('story-image-input');
  const selectFileBtn = document.querySelector('#story-upload-container .select-file-btn');
  
  if (storyUploadArea && storyFileInput) {
    console.log('Configurando eventos para upload de Stories');
    
    // Remover eventos anteriores do input de arquivo
    const newStoryFileInput = storyFileInput.cloneNode(true);
    storyFileInput.parentNode.replaceChild(newStoryFileInput, storyFileInput);
    
    // Evento de clique na área de upload
    storyUploadArea.addEventListener('click', function(e) {
      // Evitar clique no botão de remover ou no botão de selecionar
      if (e.target.closest('.story-remove-btn') || e.target.closest('.select-file-btn')) return;
      
      // Acionar o input de arquivo
      console.log('Área de story clicada, acionando input');
      document.getElementById('story-image-input').click();
    });
    
    // Evento de clique no botão de selecionar arquivo
    if (selectFileBtn) {
      selectFileBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Botão de story clicado, acionando input');
        document.getElementById('story-image-input').click();
      });
    }
    
    // Eventos de drag and drop
    storyUploadArea.addEventListener('dragover', function(e) {
      e.preventDefault();
      e.stopPropagation();
      this.classList.add('dragover');
    });
    
    storyUploadArea.addEventListener('dragleave', function(e) {
      e.preventDefault();
      e.stopPropagation();
      this.classList.remove('dragover');
    });
    
    storyUploadArea.addEventListener('drop', function(e) {
      e.preventDefault();
      e.stopPropagation();
      this.classList.remove('dragover');
      
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        // Atualizar o input de arquivo
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(e.dataTransfer.files[0]);
        document.getElementById('story-image-input').files = dataTransfer.files;
        
        // Disparar o evento change para acionar o processamento
        document.getElementById('story-image-input').dispatchEvent(new Event('change'));
      }
    });
    
    // Evento de mudança no input de arquivo
    document.getElementById('story-image-input').addEventListener('change', function(e) {
      const file = this.files[0];
      
      console.log('Story file input change event triggered', file);
      
      if (!file) return;
      
      // Verificar tipo de arquivo
      const fileType = file.type;
      if (!fileType.startsWith('image/')) {
        alert('Por favor, selecione uma imagem válida para o Story.');
        this.value = ''; // Limpar o input
        return;
      }
      
      // Verificar tamanho do arquivo (máximo 1GB)
      if (file.size > 1073741824) {
        alert('O arquivo é muito grande. O tamanho máximo permitido é 1GB.');
        this.value = ''; // Limpar o input
        return;
      }
      
      // Mostrar indicador de carregamento
      showLoading('Processando imagem...');
      
      // Criar visualização prévia
      const reader = new FileReader();
      reader.onload = function(e) {
        const previewWrapper = document.querySelector('.story-preview-wrapper');
        const previewImg = document.getElementById('story-image-preview');
        
        if (previewWrapper && previewImg) {
          previewImg.src = e.target.result;
          previewWrapper.classList.remove('d-none');
          
          // Esconder o indicador de carregamento
          hideLoading();
          
          // Esconder a área de upload quando o preview estiver visível
          storyUploadArea.classList.add('d-none');
          
          // Registrar para depuração
          console.log('Preview de story carregado com sucesso:', file.name);
          
          // Mostrar toast de confirmação
          showStoryUploadToast();
        }
      };
      
      reader.onerror = function() {
        console.error('Erro ao ler o arquivo:', file.name);
        hideLoading();
        alert('Ocorreu um erro ao processar a imagem. Por favor, tente novamente.');
      };
      
      reader.readAsDataURL(file);
    });
    
    // Botão para remover a imagem
    document.addEventListener('click', function(e) {
      if (e.target.closest('.story-remove-btn')) {
        // Limpar o input de arquivo
        document.getElementById('story-image-input').value = '';
        
        // Esconder o preview
        const previewContainer = document.querySelector('.story-preview-wrapper');
        if (previewContainer) {
          previewContainer.classList.add('d-none');
        }
        
        // Mostrar a área de upload
        storyUploadArea.classList.remove('d-none');
        
        console.log('Story removido');
      }
    });
  }
  
  // Verificar o tipo de postagem inicial
  toggleStoryUpload();
  
  // Função para mostrar toast de confirmação
  function showStoryUploadToast() {
    // Verificar se o container de toasts existe
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      // Criar container de toasts
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
      document.body.appendChild(toastContainer);
    }
    
    // Criar toast
    const toastId = 'story-upload-toast-' + Date.now();
    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = 'toast';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    // Conteúdo do toast
    toast.innerHTML = `
      <div class="toast-header">
        <i class="fas fa-check-circle text-success me-2"></i>
        <strong class="me-auto">Upload para Stories</strong>
        <small>Agora</small>
        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Fechar"></button>
      </div>
      <div class="toast-body">
        Imagem para Stories selecionada com sucesso.
      </div>
    `;
    
    // Adicionar toast ao container
    toastContainer.appendChild(toast);
    
    // Inicializar e mostrar o toast
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    // Remover o toast após ser fechado
    toast.addEventListener('hidden.bs.toast', function() {
      this.remove();
    });
  }
});

// Mostra um indicador de carregamento
function showLoading(message = 'Carregando...') {
  // Verificar se já existe um indicador de carregamento
  let loadingIndicator = document.getElementById('loading-indicator');
  
  if (!loadingIndicator) {
    // Criar o indicador de carregamento
    loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'loading-indicator';
    loadingIndicator.className = 'loading-indicator';
    
    // Adicionar spinner e mensagem
    loadingIndicator.innerHTML = `
      <div class="loading-spinner"></div>
      <div class="loading-message">${message}</div>
    `;
    
    // Adicionar ao body
    document.body.appendChild(loadingIndicator);
    
    // Adicionar estilo se necessário
    if (!document.getElementById('loading-style')) {
      const style = document.createElement('style');
      style.id = 'loading-style';
      style.textContent = `
        .loading-indicator {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          z-index: 9999;
        }
        .loading-spinner {
          width: 50px;
          height: 50px;
          border: 5px solid #f3f3f3;
          border-top: 5px solid #3498db;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        .loading-message {
          margin-top: 15px;
          color: white;
          font-weight: bold;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }
  } else {
    // Atualizar a mensagem
    const messageElement = loadingIndicator.querySelector('.loading-message');
    if (messageElement) {
      messageElement.textContent = message;
    }
    
    // Mostrar o indicador
    loadingIndicator.style.display = 'flex';
  }
}

// Esconde o indicador de carregamento
function hideLoading() {
  const loadingIndicator = document.getElementById('loading-indicator');
  if (loadingIndicator) {
    loadingIndicator.style.display = 'none';
  }
}
