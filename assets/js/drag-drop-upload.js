/**
 * Drag and Drop Upload Handler
 * Adiciona funcionalidade de drag-and-drop para todos os tipos de mídia no sistema
 */

document.addEventListener('DOMContentLoaded', function() {
    // Inicializar drag-and-drop para todas as áreas de upload
    initDragAndDrop();
    
    /**
     * Inicializa a funcionalidade de drag-and-drop para todas as áreas de upload
     */
    function initDragAndDrop() {
        console.log('Inicializando drag-and-drop para uploads...');
        
        // Selecionar todas as áreas de upload
        const uploadAreas = document.querySelectorAll('.upload-area, .story-upload-area');
        
        if (!uploadAreas || uploadAreas.length === 0) {
            console.warn('Nenhuma área de upload encontrada para inicializar drag-and-drop');
            return;
        }
        
        // Configurar cada área de upload
        uploadAreas.forEach(area => {
            const fileInput = area.querySelector('input[type="file"]');
            
            if (!fileInput) {
                console.warn('Input de arquivo não encontrado na área de upload:', area);
                return;
            }
            
            // Adicionar classe para indicar que o drag-and-drop está ativo
            area.classList.add('drag-drop-enabled');
            
            // Adicionar eventos de drag-and-drop
            area.addEventListener('dragover', handleDragOver);
            area.addEventListener('dragleave', handleDragLeave);
            area.addEventListener('drop', function(e) {
                handleDrop(e, fileInput);
            });
            
            // Adicionar evento de clique para abrir o seletor de arquivo
            area.addEventListener('click', function(e) {
                // Evitar que o clique no botão de seleção de arquivo dispare este evento
                // Verificar se o clique foi no botão ou em qualquer de seus elementos filhos
                const clickedButton = e.target.closest('.select-file-btn');
                if (!clickedButton) {
                    // Se o clique não foi no botão, abrir o seletor de arquivo
                    e.preventDefault();
                    e.stopPropagation();
                    fileInput.click();
                }
                // Se o clique foi no botão, não fazer nada e deixar o evento do botão ser processado
            });
            
            console.log('Drag-and-drop inicializado para:', fileInput.id);
        });
        
        // Configurar áreas de slots de carrossel
        const carouselSlotsContainer = document.getElementById('carousel-slots-container');
        if (carouselSlotsContainer) {
            // Criar slots para carrossel
            createCarouselSlots();
            
            // Adicionar eventos de drag-and-drop para cada slot
            const slots = carouselSlotsContainer.querySelectorAll('.carousel-slot');
            slots.forEach(slot => {
                slot.addEventListener('dragover', handleDragOver);
                slot.addEventListener('dragleave', handleDragLeave);
                slot.addEventListener('drop', function(e) {
                    handleCarouselSlotDrop(e, slot);
                });
            });
        }
    }
    
    /**
     * Cria slots para upload de carrossel
     */
    function createCarouselSlots() {
        const container = document.getElementById('carousel-slots-container');
        if (!container) return;
        
        // Limpar slots existentes
        container.innerHTML = '';
        
        // Criar 20 slots para carrossel
        for (let i = 0; i < 20; i++) {
            const slot = document.createElement('div');
            slot.className = 'carousel-slot';
            slot.dataset.index = i;
            
            // Adicionar número do slot
            const slotNumber = document.createElement('div');
            slotNumber.className = 'slot-number';
            slotNumber.textContent = i + 1;
            slot.appendChild(slotNumber);
            
            // Adicionar ícone de upload
            const uploadIcon = document.createElement('div');
            uploadIcon.className = 'upload-icon';
            uploadIcon.innerHTML = '<i class="fas fa-plus"></i>';
            slot.appendChild(uploadIcon);
            
            // Adicionar evento de clique
            slot.addEventListener('click', function() {
                // Abrir seletor de arquivo para este slot
                const input = document.getElementById('carouselFiles');
                if (input) {
                    input.dataset.slotIndex = i;
                    input.click();
                }
            });
            
            container.appendChild(slot);
        }
    }
    
    /**
     * Manipula o evento dragover
     * @param {Event} e - Evento dragover
     */
    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Adicionar classe de destaque
        this.classList.add('drag-over');
    }
    
    /**
     * Manipula o evento dragleave
     * @param {Event} e - Evento dragleave
     */
    function handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Remover classe de destaque
        this.classList.remove('drag-over');
    }
    
    /**
     * Manipula o evento drop para áreas de upload gerais
     * @param {Event} e - Evento drop
     * @param {HTMLInputElement} fileInput - Input de arquivo associado
     */
    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Remover classe de destaque
        this.classList.remove('drag-over');
        
        // Obter o input de arquivo associado
        const fileInput = this.querySelector('input[type="file"]');
        if (!fileInput) {
            console.error('Input de arquivo não encontrado');
            return;
        }
        
        // Obter arquivos arrastados
        const files = e.dataTransfer.files;
        if (!files || files.length === 0) {
            console.warn('Nenhum arquivo foi arrastado');
            return;
        }
        
        // Verificar se o input aceita múltiplos arquivos
        if (!fileInput.multiple && files.length > 1) {
            alert('Este campo aceita apenas um arquivo. Apenas o primeiro arquivo será usado.');
        }
        
        // Criar um novo objeto FileList simulado
        const dataTransfer = new DataTransfer();
        
        // Adicionar apenas os arquivos permitidos pelo atributo accept
        const acceptedTypes = fileInput.accept ? fileInput.accept.split(',') : null;
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            // Verificar se o tipo de arquivo é aceito
            if (acceptedTypes && !isFileTypeAccepted(file, acceptedTypes)) {
                alert(`O arquivo "${file.name}" não é de um tipo permitido.`);
                continue;
            }
            
            // Adicionar arquivo ao DataTransfer
            dataTransfer.items.add(file);
            
            // Se não for múltiplo, adicionar apenas o primeiro arquivo
            if (!fileInput.multiple) break;
        }
        
        // Atualizar o valor do input
        fileInput.files = dataTransfer.files;
        
        // Disparar evento change para acionar os listeners existentes
        const changeEvent = new Event('change', { bubbles: true });
        fileInput.dispatchEvent(changeEvent);
    }
    
    /**
     * Manipula o evento drop para slots de carrossel
     * @param {Event} e - Evento drop
     * @param {HTMLElement} slot - Slot de carrossel
     */
    function handleCarouselSlotDrop(e, slot) {
        e.preventDefault();
        e.stopPropagation();
        
        // Remover classe de destaque
        slot.classList.remove('drag-over');
        
        // Obter o índice do slot
        const slotIndex = parseInt(slot.dataset.index, 10);
        
        // Obter arquivos arrastados
        const files = e.dataTransfer.files;
        if (!files || files.length === 0) {
            console.warn('Nenhum arquivo foi arrastado');
            return;
        }
        
        // Usar apenas o primeiro arquivo
        const file = files[0];
        
        // Verificar se é uma imagem
        if (!file.type.startsWith('image/')) {
            alert('Apenas imagens são permitidas para o carrossel.');
            return;
        }
        
        // Adicionar o arquivo ao slot
        addFileToCarouselSlot(file, slot, slotIndex);
    }
    
    /**
     * Adiciona um arquivo a um slot de carrossel
     * @param {File} file - Arquivo a ser adicionado
     * @param {HTMLElement} slot - Slot de carrossel
     * @param {number} slotIndex - Índice do slot
     */
    function addFileToCarouselSlot(file, slot, slotIndex) {
        // Limpar o slot
        slot.innerHTML = '';
        slot.classList.add('has-file');
        
        // Criar visualização da imagem
        const reader = new FileReader();
        reader.onload = function(e) {
            // Criar elemento de imagem
            const img = document.createElement('img');
            img.src = e.target.result;
            img.className = 'slot-preview';
            slot.appendChild(img);
            
            // Adicionar número do slot
            const slotNumber = document.createElement('div');
            slotNumber.className = 'slot-number';
            slotNumber.textContent = slotIndex + 1;
            slot.appendChild(slotNumber);
            
            // Adicionar botão de remover
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'slot-remove-btn';
            removeBtn.innerHTML = '<i class="fas fa-times"></i>';
            removeBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                resetCarouselSlot(slot, slotIndex);
            });
            slot.appendChild(removeBtn);
            
            // Armazenar o arquivo no slot
            slot.dataset.filename = file.name;
            
            // Adicionar o arquivo ao input de carrossel
            addFileToCarouselInput(file, slotIndex);
        };
        
        reader.readAsDataURL(file);
    }
    
    /**
     * Adiciona um arquivo ao input de carrossel
     * @param {File} file - Arquivo a ser adicionado
     * @param {number} slotIndex - Índice do slot
     */
    function addFileToCarouselInput(file, slotIndex) {
        const input = document.getElementById('carouselFiles');
        if (!input) return;
        
        // Criar um novo objeto FileList simulado
        const dataTransfer = new DataTransfer();
        
        // Adicionar arquivos existentes
        if (input.files && input.files.length > 0) {
            for (let i = 0; i < input.files.length; i++) {
                // Pular o arquivo no mesmo índice (substituição)
                if (i !== slotIndex) {
                    dataTransfer.items.add(input.files[i]);
                }
            }
        }
        
        // Adicionar o novo arquivo na posição correta
        dataTransfer.items.add(file);
        
        // Atualizar o valor do input
        input.files = dataTransfer.files;
        
        // Atualizar contador de carrossel
        updateCarouselCounter();
    }
    
    /**
     * Reseta um slot de carrossel
     * @param {HTMLElement} slot - Slot de carrossel
     * @param {number} slotIndex - Índice do slot
     */
    function resetCarouselSlot(slot, slotIndex) {
        // Limpar o slot
        slot.innerHTML = '';
        slot.classList.remove('has-file');
        
        // Adicionar número do slot
        const slotNumber = document.createElement('div');
        slotNumber.className = 'slot-number';
        slotNumber.textContent = slotIndex + 1;
        slot.appendChild(slotNumber);
        
        // Adicionar ícone de upload
        const uploadIcon = document.createElement('div');
        uploadIcon.className = 'upload-icon';
        uploadIcon.innerHTML = '<i class="fas fa-plus"></i>';
        slot.appendChild(uploadIcon);
        
        // Remover o arquivo do input de carrossel
        removeFileFromCarouselInput(slotIndex);
    }
    
    /**
     * Remove um arquivo do input de carrossel
     * @param {number} slotIndex - Índice do slot
     */
    function removeFileFromCarouselInput(slotIndex) {
        const input = document.getElementById('carouselFiles');
        if (!input || !input.files || input.files.length === 0) return;
        
        // Criar um novo objeto FileList simulado
        const dataTransfer = new DataTransfer();
        
        // Adicionar todos os arquivos exceto o do índice especificado
        for (let i = 0; i < input.files.length; i++) {
            if (i !== slotIndex) {
                dataTransfer.items.add(input.files[i]);
            }
        }
        
        // Atualizar o valor do input
        input.files = dataTransfer.files;
        
        // Atualizar contador de carrossel
        updateCarouselCounter();
    }
    
    /**
     * Atualiza o contador de arquivos do carrossel
     */
    function updateCarouselCounter() {
        const counter = document.getElementById('carousel-counter');
        const input = document.getElementById('carouselFiles');
        
        if (!counter || !input) return;
        
        const count = input.files ? input.files.length : 0;
        counter.textContent = `${count}/20`;
        
        // Atualizar classe do contador
        if (count >= 20) {
            counter.classList.add('counter-full');
        } else {
            counter.classList.remove('counter-full');
        }
    }
    
    /**
     * Verifica se o tipo de arquivo é aceito
     * @param {File} file - Arquivo a ser verificado
     * @param {string[]} acceptedTypes - Tipos de arquivo aceitos
     * @returns {boolean} - Verdadeiro se o arquivo for aceito
     */
    function isFileTypeAccepted(file, acceptedTypes) {
        if (!acceptedTypes) return true;
        
        // Verificar cada tipo aceito
        for (let i = 0; i < acceptedTypes.length; i++) {
            const type = acceptedTypes[i].trim();
            
            // Verificar por tipo MIME exato
            if (file.type === type) return true;
            
            // Verificar por tipo MIME parcial (ex: image/*)
            if (type.endsWith('/*') && file.type.startsWith(type.replace('/*', '/'))) return true;
            
            // Verificar por extensão
            if (type.startsWith('.')) {
                const extension = '.' + file.name.split('.').pop().toLowerCase();
                if (extension === type.toLowerCase()) return true;
            }
        }
        
        return false;
    }
});
