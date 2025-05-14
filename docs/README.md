# Sistema de Upload e Programação de Postagens

Esta pasta contém cópias dos arquivos relacionados ao sistema de upload de arquivos e programação de postagens. O objetivo é facilitar a análise e depuração dos problemas relacionados a estas funcionalidades.

## Arquivos Incluídos

### Arquivos PHP
- `index.php` - Cópia da página principal que contém o formulário de upload e agendamento
- `confirmar_postagem.php` - Página de confirmação após o upload
- `postagens_agendadas.php` - Lista de postagens agendadas
- `visualizar_postagem.php` - Visualização detalhada de uma postagem
- `webhooks.php` - Gerenciamento de webhooks
- `teste_webhook.php` - Teste de envio de webhook

### Arquivos JavaScript
- `upload-fix.js` - Script principal para corrigir problemas de upload (versão 3.1)
- `upload-feedback.js` - Fornece feedback visual durante o upload
- `story-upload-handler.js` - Gerencia uploads específicos para Stories
- `story-processor.js` - Processa imagens para o formato de Stories (1080×1920)
- `carousel-upload.js` - Gerencia uploads de carrossel
- `agendamento.js` - Script para gerenciar o formulário de agendamento

### Arquivos CSS
- `upload-feedback.css` - Estilos para feedback de upload
- `carousel-upload.css` - Estilos para o upload de carrossel

### Arquivos de Configuração
- `config.php` - Configurações gerais e funções auxiliares
- `db.php` - Conexão com o banco de dados

### Documentação
- `analise_upload.md` - Análise detalhada do sistema de upload
- `analise_programacao_postagem.md` - Análise detalhada do sistema de programação de postagem

## Problemas de Upload Resolvidos

1. **Upload de Feed requer dois cliques para selecionar o arquivo**
   - Problema: O primeiro clique no botão de upload não acionava o input de arquivo
   - Solução: Implementação de um sistema robusto que limpa todos os event listeners anteriores e adiciona novos

2. **Upload de Stories não funciona corretamente**
   - Problema: O arquivo era selecionado, mas não mostrava o preview e não era enviado
   - Solução: Correção das referências a elementos DOM e melhoria no feedback visual

## Problemas de Programação de Postagem Resolvidos

1. **Erro de coluna 'p.webhook_enviado' não encontrada**
   - Solução: Uso da coluna 'webhook_status' em vez de 'webhook_enviado'

2. **Erro ao decodificar o campo `post_id_unique` como JSON**
   - Solução: Uso do campo `arquivos` para armazenar as URLs dos arquivos

3. **Datas exibidas como "Data não definida" na tabela de postagens agendadas**
   - Solução: Uso da coluna `data_postagem_utc` como fallback e conversão para horário local

4. **Erro de violação de chave estrangeira ao inserir nova postagem**
   - Solução: Inclusão do campo `usuario_id` na inserção

## Como Testar o Upload

1. Abra a página `index.php` no navegador
2. Selecione um tipo de postagem (Feed, Stories, Feed e Stories)
3. Selecione um formato (Imagem Única, Vídeo Único, Carrossel)
4. Tente fazer upload de arquivos usando os diferentes métodos:
   - Clicando no botão "Selecionar arquivo"
   - Arrastando arquivos para a área de upload
5. Verifique se o preview é exibido corretamente
6. Prossiga para a confirmação e verifique se os arquivos são processados corretamente

## Como Testar a Programação de Postagem

1. Abra a página `index.php` no navegador
2. Preencha o formulário de agendamento:
   - Selecione um cliente
   - Escolha tipo de postagem e formato
   - Defina data e hora de postagem
   - Faça upload dos arquivos
   - Adicione legenda (opcional)
3. Clique em "Prosseguir para Confirmação"
4. Verifique os dados na página de confirmação
5. Confirme o agendamento
6. Verifique se a postagem aparece na lista de postagens agendadas
7. Teste o envio do webhook usando `teste_webhook.php`

## Fluxo de Processamento de Upload

1. Seleção do arquivo (JavaScript frontend)
2. Processamento do arquivo (se necessário, como no caso de Stories)
3. Exibição do preview
4. Envio do formulário para processamento no backend
5. Confirmação e salvamento no banco de dados

## Fluxo de Agendamento de Postagem

1. Preenchimento do formulário em `index.php`
2. Processamento dos dados e upload dos arquivos
3. Confirmação dos dados em `confirmar_postagem.php`
4. Salvamento no banco de dados
5. Envio do webhook para o servidor de automação externo
6. Visualização das postagens agendadas em `postagens_agendadas.php`
