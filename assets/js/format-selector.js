/**
 * Controla a seleção de formato e exibição das áreas de upload correspondentes
 */

document.addEventListener('DOMContentLoaded', function() {
  // Elementos de formato
  const formatoOptions = document.querySelectorAll('.format-option');
  const formatoInput = document.getElementById('formato');
  
  // Containers de upload
  const singleUploadContainer = document.getElementById('single-upload-container');
  const carouselUploadContainer = document.getElementById('carousel-upload-container');
  
  // Verificar o tipo de postagem atual
  function getTipoPostagem() {
    const tipoPostagemInput = document.getElementById('tipo_postagem');
    return tipoPostagemInput ? tipoPostagemInput.value : '';
  }
  
  // Verificar se o formato é compatível com o tipo de postagem
  function isFormatoCompatible(formato, tipoPostagem) {
    // Se o tipo de postagem for Feed e Stories, não permitir Carrossel
    if (tipoPostagem === 'Feed e Stories' && formato === 'Carrossel') {
      return false;
    }
    return true;
  }
  
  // Atualizar a disponibilidade dos formatos com base no tipo de postagem
  function updateFormatosAvailability() {
    const tipoPostagem = getTipoPostagem();
    
    formatoOptions.forEach(option => {
      const formato = option.getAttribute('data-value');
      
      if (!isFormatoCompatible(formato, tipoPostagem)) {
        option.classList.add('disabled');
        option.setAttribute('title', 'Este formato não está disponível para o tipo de postagem selecionado');
      } else {
        option.classList.remove('disabled');
        option.removeAttribute('title');
      }
    });
  }
  
  // Adicionar eventos aos botões de formato
  formatoOptions.forEach(option => {
    option.addEventListener('click', function() {
      // Verificar se a opção está desabilitada
      if (this.classList.contains('disabled')) {
        return; // Não fazer nada se estiver desabilitada
      }
      
      // Remover classe ativa de todas as opções
      formatoOptions.forEach(opt => opt.classList.remove('active'));
      
      // Adicionar classe ativa à opção selecionada
      this.classList.add('active');
      
      // Atualizar o valor do input hidden
      const formatoValue = this.getAttribute('data-value');
      formatoInput.value = formatoValue;
      
      // Mostrar/esconder containers de upload com base no formato selecionado
      toggleUploadContainers(formatoValue);
    });
  });
  
  // Adicionar evento para os botões de tipo de postagem
  const tipoPostagemOptions = document.querySelectorAll('.post-type-option');
  tipoPostagemOptions.forEach(option => {
    option.addEventListener('click', function() {
      // Atualizar a disponibilidade dos formatos após mudar o tipo de postagem
      setTimeout(updateFormatosAvailability, 10);
      
      // Se o formato atual não for compatível com o novo tipo de postagem, resetar para Imagem Única
      const tipoPostagem = this.getAttribute('data-value');
      const formatoAtual = formatoInput.value;
      
      if (!isFormatoCompatible(formatoAtual, tipoPostagem)) {
        // Resetar para Imagem Única
        formatoInput.value = 'Imagem Única';
        
        // Atualizar a interface
        formatoOptions.forEach(opt => {
          if (opt.getAttribute('data-value') === 'Imagem Única') {
            opt.classList.add('active');
          } else {
            opt.classList.remove('active');
          }
        });
        
        // Atualizar os containers
        toggleUploadContainers('Imagem Única');
      }
    });
  });
  
  // Função para mostrar/esconder containers de upload
  function toggleUploadContainers(formato) {
    // Esconder todos os containers primeiro
    if (singleUploadContainer) singleUploadContainer.classList.add('d-none');
    if (carouselUploadContainer) carouselUploadContainer.classList.add('d-none');
    
    // Verificar o tipo de postagem atual
    const tipoPostagem = getTipoPostagem();
    
    // Se for apenas Stories, não mostrar a área de upload padrão
    if (tipoPostagem === 'Stories') {
      return; // Não mostrar nenhum container padrão
    }
    
    // Mostrar o container apropriado com base no formato
    switch (formato) {
      case 'Imagem Única':
      case 'Vídeo Único':
      case 'Reels':
        if (singleUploadContainer) singleUploadContainer.classList.remove('d-none');
        break;
      case 'Carrossel':
        if (carouselUploadContainer) carouselUploadContainer.classList.remove('d-none');
        break;
    }
  }
  
  // Inicializar a disponibilidade dos formatos
  updateFormatosAvailability();
  
  // Verificar se há um formato já selecionado (por exemplo, ao voltar à página)
  if (formatoInput && formatoInput.value) {
    // Encontrar e ativar a opção correspondente
    const selectedOption = document.querySelector(`.format-option[data-value="${formatoInput.value}"]`);
    if (selectedOption) {
      selectedOption.classList.add('active');
      toggleUploadContainers(formatoInput.value);
    }
  }
});
