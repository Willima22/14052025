/**
 * Script simplificado para upload de arquivos
 * Versão 3.1 - Solução para problemas de upload
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('Upload Fix Script v3.1 - Carregado');
    
    // Limpar todos os event listeners anteriores dos botões de seleção de arquivo
    function fixUploadButtons() {
        console.log('Corrigindo botões de upload...');
        
        // 1. Corrigir botões de seleção de arquivo
        document.querySelectorAll('.select-file-btn').forEach(function(button) {
            // Clonar e substituir para remover todos os event listeners anteriores
            const clone = button.cloneNode(true);
            button.parentNode.replaceChild(clone, button);
            
            // Adicionar novo evento de clique diretamente
            clone.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const targetInputId = this.getAttribute('data-target');
                console.log('Botão clicado para target:', targetInputId);
                
                if (targetInputId) {
                    const fileInput = document.getElementById(targetInputId);
                    if (fileInput) {
                        console.log('Acionando input de arquivo:', targetInputId);
                        fileInput.click();
                    } else {
                        console.error('Input de arquivo não encontrado:', targetInputId);
                    }
                }
            });
        });
        
        // 2. Corrigir áreas de upload para serem clicáveis
        document.querySelectorAll('.upload-area, .story-upload-area').forEach(function(area) {
            // Clonar e substituir para remover todos os event listeners anteriores
            const clone = area.cloneNode(true);
            area.parentNode.replaceChild(clone, area);
            
            // Adicionar novo evento de clique
            clone.addEventListener('click', function(e) {
                // Não acionar se o clique foi em um botão ou outro elemento interativo
                if (e.target.closest('button') || e.target.closest('input')) {
                    return;
                }
                
                // Encontrar o input de arquivo associado
                const fileInput = this.querySelector('input[type="file"]');
                if (fileInput) {
                    console.log('Área clicada, acionando input:', fileInput.id);
                    fileInput.click();
                } else {
                    // Tentar encontrar pelo data-target do botão
                    const btn = this.querySelector('.select-file-btn');
                    if (btn) {
                        const targetId = btn.getAttribute('data-target');
                        if (targetId) {
                            const targetInput = document.getElementById(targetId);
                            if (targetInput) {
                                console.log('Área clicada, acionando input via botão:', targetId);
                                targetInput.click();
                            }
                        }
                    }
                }
            });
        });
        
        console.log('Correção de botões de upload concluída');
    }
    
    // Executar a correção imediatamente
    fixUploadButtons();
    
    // Executar novamente após um curto atraso para garantir que todos os outros scripts foram carregados
    setTimeout(fixUploadButtons, 500);
});
