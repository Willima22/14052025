/**
 * Processador de imagens para Stories
 * 
 * Ajusta automaticamente qualquer imagem enviada para o formato padrão de Stories (1080px × 1920px),
 * centralizando a imagem original em um fundo branco quando necessário.
 */

// Dimensões padrão para Stories do Instagram
const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;

/**
 * Ajusta uma imagem para o formato de Stories (1080×1920)
 * @param {File} imageFile - O arquivo de imagem original
 * @returns {Promise<Blob>} - Promessa com o blob da imagem ajustada
 */
function processStoryImage(imageFile) {
  return new Promise((resolve, reject) => {
    // Criar um objeto URL para a imagem
    const imageUrl = URL.createObjectURL(imageFile);
    const img = new Image();
    
    img.onload = () => {
      // Verificar se a imagem já está no formato correto
      if (img.width === STORY_WIDTH && img.height === STORY_HEIGHT) {
        // Se já estiver no formato correto, apenas retornar o arquivo original
        URL.revokeObjectURL(imageUrl);
        
        // Converter o arquivo para blob para manter a consistência da API
        const reader = new FileReader();
        reader.onload = () => {
          const blob = new Blob([reader.result], { type: imageFile.type });
          resolve(blob);
        };
        reader.onerror = () => reject(new Error('Erro ao ler o arquivo'));
        reader.readAsArrayBuffer(imageFile);
        return;
      }
      
      // Criar um canvas com as dimensões do Stories
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Definir as dimensões do canvas
      canvas.width = STORY_WIDTH;
      canvas.height = STORY_HEIGHT;
      
      // Preencher o canvas com branco
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Calcular a escala proporcional para redimensionar a imagem
      const scale = Math.min(
        STORY_WIDTH / img.width,
        STORY_HEIGHT / img.height
      );
      
      // Calcular as novas dimensões da imagem
      const newWidth = img.width * scale;
      const newHeight = img.height * scale;
      
      // Calcular a posição para centralizar a imagem
      const x = (STORY_WIDTH - newWidth) / 2;
      const y = (STORY_HEIGHT - newHeight) / 2;
      
      // Desenhar a imagem redimensionada e centralizada no canvas
      ctx.drawImage(img, x, y, newWidth, newHeight);
      
      // Converter o canvas para um blob
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(imageUrl);
        resolve(blob);
      }, imageFile.type || 'image/jpeg', 0.92); // Qualidade 92% é um bom equilíbrio
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error('Erro ao carregar a imagem'));
    };
    
    // Definir a fonte da imagem para iniciar o carregamento
    img.src = imageUrl;
  });
}

/**
 * Cria um arquivo a partir de um blob
 * @param {Blob} blob - O blob da imagem processada
 * @param {string} fileName - Nome do arquivo original
 * @returns {File} - Arquivo processado
 */
function createFileFromBlob(blob, fileName) {
  // Extrair a extensão do arquivo original
  const extension = fileName.split('.').pop().toLowerCase();
  
  // Determinar o tipo MIME com base na extensão
  let mimeType = 'image/jpeg'; // Padrão
  if (extension === 'png') mimeType = 'image/png';
  if (extension === 'gif') mimeType = 'image/gif';
  
  // Criar um novo nome de arquivo mantendo a extensão original
  const newFileName = `story_${Date.now()}.${extension}`;
  
  // Criar e retornar um novo objeto File
  return new File([blob], newFileName, {
    type: mimeType,
    lastModified: new Date().getTime()
  });
}

/**
 * Inicializa o processador de imagens para Stories
 */
document.addEventListener('DOMContentLoaded', function() {
  // Verificar se estamos na página correta
  const storyImageInput = document.getElementById('story-image-input');
  const singleFileInput = document.getElementById('singleFile'); // Input para Feed
  if (!storyImageInput) return;
  
  console.log('Inicializando processador de imagens para Stories...');
  
  // Elemento para preview
  const previewElement = document.getElementById('story-image-preview');
  
  // Remover eventos anteriores do input de arquivo
  const newStoryImageInput = storyImageInput.cloneNode(true);
  storyImageInput.parentNode.replaceChild(newStoryImageInput, storyImageInput);
  
  // Adicionar evento de mudança ao input de arquivo
  document.getElementById('story-image-input').addEventListener('change', async (event) => {
    try {
      const imageFile = event.target.files[0];
      if (!imageFile) return;
      
      console.log('Processando arquivo para Stories:', imageFile.name);
      
      // Verificar se é uma imagem
      if (!imageFile.type.match('image.*')) {
        alert('Por favor, selecione uma imagem válida.');
        return;
      }
      
      // Mostrar indicador de carregamento
      if (typeof showLoading === 'function') {
        showLoading('Processando imagem...');
      }
      
      // Primeiro, copiar a imagem original para o input de Feed (coluna feed)
      // Apenas se o tipo de postagem for "Feed e Stories"
      const tipoPostagem = document.getElementById('tipo_postagem').value;
      if (tipoPostagem === 'Feed e Stories' && singleFileInput) {
        // Marcar explicitamente que esta imagem é para o feed
        const feedFile = new File([imageFile], imageFile.name, {
          type: imageFile.type,
          lastModified: imageFile.lastModified
        });
        // Adicionar uma propriedade personalizada para identificar como feed
        Object.defineProperty(feedFile, 'feedType', {
          value: 'feed',
          writable: false
        });
        
        const originalDataTransfer = new DataTransfer();
        originalDataTransfer.items.add(feedFile);
        singleFileInput.files = originalDataTransfer.files;
        
        // Disparar evento de change para atualizar o preview do Feed
        singleFileInput.dispatchEvent(new Event('change'));
        console.log('Imagem original copiada para o Feed');
      }
      
      // Processar a imagem para Stories (coluna stories)
      console.log('Iniciando processamento da imagem para Stories...');
      const processedBlob = await processStoryImage(imageFile);
      console.log('Imagem processada com sucesso, criando arquivo...');
      
      // Criar um arquivo a partir do blob
      const processedFile = createFileFromBlob(processedBlob, imageFile.name);
      
      // Atualizar o input com o arquivo processado
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(processedFile);
      document.getElementById('story-image-input').files = dataTransfer.files;
      
      // Mostrar preview da imagem processada
      if (previewElement) {
        const previewUrl = URL.createObjectURL(processedBlob);
        previewElement.src = previewUrl;
        previewElement.parentElement.classList.remove('d-none');
        
        // Esconder a área de upload quando o preview estiver visível
        const uploadArea = document.querySelector('.story-upload-area');
        if (uploadArea) {
          uploadArea.classList.add('d-none');
        }
      }
      
      // Esconder indicador de carregamento
      if (typeof hideLoading === 'function') {
        hideLoading();
      }
      
      console.log('Imagem processada com sucesso para Stories!');
      
      // Mostrar toast de confirmação se disponível
      if (typeof showStoryUploadToast === 'function') {
        showStoryUploadToast();
      } else {
        // Criar um toast simples
        const event = new CustomEvent('story-processed', { detail: { success: true } });
        document.dispatchEvent(event);
      }
    } catch (error) {
      console.error('Erro no processamento da imagem:', error);
      alert('Ocorreu um erro ao processar a imagem. Por favor, tente novamente.');
      
      // Esconder indicador de carregamento em caso de erro
      if (typeof hideLoading === 'function') {
        hideLoading();
      }
    }
  });
});

// Exportar funções para uso global
window.StoryProcessor = {
  processStoryImage,
  createFileFromBlob
};
