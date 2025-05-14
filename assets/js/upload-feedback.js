/**
 * Script para fornecer feedback visual durante o upload de arquivos
 * Complementa a funcionalidade de drag-and-drop
 */

document.addEventListener('DOMContentLoaded', function() {
    // Inicializar feedback visual para uploads
    initUploadFeedback();
    
    /**
     * Inicializa o feedback visual para uploads
     */
    function initUploadFeedback() {
        console.log('Inicializando feedback visual para uploads...');
        
        // Selecionar todos os inputs de arquivo
        const fileInputs = document.querySelectorAll('input[type="file"]');
        
        if (!fileInputs || fileInputs.length === 0) {
            console.warn('Nenhum input de arquivo encontrado para inicializar feedback visual');
            return;
        }
        
        // Configurar cada input de arquivo
        fileInputs.forEach(input => {
            // Adicionar evento change para mostrar feedback
            input.addEventListener('change', function(e) {
                // Verificar se há arquivos selecionados
                if (!this.files || this.files.length === 0) return;
                
                // Mostrar feedback de sucesso
                showUploadFeedback(this, 'success');
                
                // Mostrar contador de arquivos para inputs múltiplos
                if (this.multiple && this.files.length > 1) {
                    showFileCounter(this);
                }
                
                // Mostrar toast de confirmação
                showUploadToast(this.files.length);
            });
        });
        
        // Configurar botões de seleção de arquivo
        const selectButtons = document.querySelectorAll('.select-file-btn');
        selectButtons.forEach(button => {
            button.addEventListener('click', function() {
                const targetId = this.dataset.target;
                if (targetId) {
                    const input = document.getElementById(targetId);
                    if (input) {
                        input.click();
                    }
                }
            });
        });
    }
    
    /**
     * Mostra feedback visual para o upload
     * @param {HTMLInputElement} input - Input de arquivo
     * @param {string} type - Tipo de feedback (success, error, warning)
     */
    function showUploadFeedback(input, type) {
        // Obter a área de upload pai
        const uploadArea = input.closest('.drag-drop-enabled');
        if (!uploadArea) return;
        
        // Remover classes de feedback anteriores
        uploadArea.classList.remove('upload-success', 'upload-error', 'upload-warning');
        
        // Adicionar classe de feedback
        uploadArea.classList.add(`upload-${type}`);
        
        // Remover a classe após 2 segundos
        setTimeout(() => {
            uploadArea.classList.remove(`upload-${type}`);
        }, 2000);
    }
    
    /**
     * Mostra contador de arquivos para inputs múltiplos
     * @param {HTMLInputElement} input - Input de arquivo
     */
    function showFileCounter(input) {
        // Obter a área de upload pai
        const uploadArea = input.closest('.drag-drop-enabled');
        if (!uploadArea) return;
        
        // Criar ou atualizar o contador
        let counter = uploadArea.querySelector('.file-counter');
        if (!counter) {
            counter = document.createElement('div');
            counter.className = 'file-counter';
            uploadArea.appendChild(counter);
        }
        
        // Atualizar o texto do contador
        counter.textContent = `${input.files.length} arquivos selecionados`;
        
        // Mostrar o contador
        counter.style.display = 'block';
    }
    
    /**
     * Mostra um toast de confirmação de upload
     * @param {number} fileCount - Número de arquivos
     */
    function showUploadToast(fileCount) {
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
        const toastId = 'upload-toast-' + Date.now();
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
                <strong class="me-auto">Upload</strong>
                <small>Agora</small>
                <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Fechar"></button>
            </div>
            <div class="toast-body">
                ${fileCount} ${fileCount > 1 ? 'arquivos selecionados' : 'arquivo selecionado'} com sucesso.
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
