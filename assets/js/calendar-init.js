/**
 * Script para inicialização de calendário e seleção de data/hora
 * Versão 2.0 - Com verificações de elementos nulos
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando calendários e seletores de data/hora...');
    
    // Verificar se o flatpickr está disponível
    if (typeof flatpickr === 'undefined') {
        console.error('Flatpickr não está disponível!');
        return;
    }
    
    try {
        // Configurar os seletores de data
        initDatepickers();
        
        // Configurar os seletores de hora
        initTimepickers();
        
        console.log('Calendários e seletores de data/hora inicializados com sucesso');
    } catch (error) {
        console.error('Erro ao inicializar calendários:', error);
    }
});

// Inicializar seletores de data
function initDatepickers() {
    // Obter todos os elementos datepicker
    const datepickers = document.querySelectorAll('.datepicker');
    
    if (!datepickers || datepickers.length === 0) {
        console.log('Nenhum datepicker encontrado na página atual');
        return;
    }
    
    // Configuração padrão para o datepicker
    const defaultConfig = {
        dateFormat: 'd/m/Y',
        locale: 'pt',
        minDate: 'today',
        allowInput: true,
        disableMobile: false,
        static: true
    };
    
    // Inicializar cada datepicker
    datepickers.forEach(function(input) {
        // Verificar se o elemento existe e é um input
        if (!input || !(input instanceof HTMLElement)) {
            console.warn('Elemento datepicker inválido:', input);
            return;
        }
        
        try {
            // Obter configurações específicas do elemento (via atributos data)
            const config = Object.assign({}, defaultConfig);
            
            // Verificar se há data mínima personalizada
            if (input.dataset.minDate) {
                config.minDate = input.dataset.minDate;
            }
            
            // Verificar se há data máxima personalizada
            if (input.dataset.maxDate) {
                config.maxDate = input.dataset.maxDate;
            }
            
            // Inicializar o datepicker
            const picker = flatpickr(input, config);
            
            // Configurar o ícone de calendário, se existir
            const calendarTrigger = document.querySelector(`.calendar-trigger[data-input="${input.id}"]`);
            if (calendarTrigger) {
                calendarTrigger.addEventListener('click', function() {
                    picker.open();
                });
            }
        } catch (error) {
            console.error(`Erro ao inicializar datepicker para ${input.id}:`, error);
        }
    });
}

// Inicializar seletores de hora
function initTimepickers() {
    // Obter todos os elementos timepicker
    const timepickers = document.querySelectorAll('.timepicker');
    
    if (!timepickers || timepickers.length === 0) {
        console.log('Nenhum timepicker encontrado na página atual');
        return;
    }
    
    // Configuração padrão para o timepicker
    const defaultConfig = {
        enableTime: true,
        noCalendar: true,
        dateFormat: 'H:i',
        time_24hr: true,
        minuteIncrement: 15,
        allowInput: true,
        static: true
    };
    
    // Inicializar cada timepicker
    timepickers.forEach(function(input) {
        // Verificar se o elemento existe e é um input
        if (!input || !(input instanceof HTMLElement)) {
            console.warn('Elemento timepicker inválido:', input);
            return;
        }
        
        try {
            // Obter configurações específicas do elemento (via atributos data)
            const config = Object.assign({}, defaultConfig);
            
            // Verificar se há valor mínimo personalizado
            if (input.dataset.minTime) {
                config.minTime = input.dataset.minTime;
            }
            
            // Verificar se há valor máximo personalizado
            if (input.dataset.maxTime) {
                config.maxTime = input.dataset.maxTime;
            }
            
            // Inicializar o timepicker
            const picker = flatpickr(input, config);
            
            // Configurar o ícone de relógio, se existir
            const clockTrigger = document.querySelector(`.clock-trigger[data-input="${input.id}"]`);
            if (clockTrigger) {
                clockTrigger.addEventListener('click', function() {
                    picker.open();
                });
            }
        } catch (error) {
            console.error(`Erro ao inicializar timepicker para ${input.id}:`, error);
        }
    });
}