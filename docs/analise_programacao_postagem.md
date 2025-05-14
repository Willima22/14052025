# Análise do Sistema de Programação de Postagem

## Visão Geral

Este documento analisa o sistema de programação de postagem implementado no sistema, focando nos componentes relacionados ao agendamento de postagens e envio de webhooks.

## Arquivos Principais

### Arquivos PHP
- `index.php` - Formulário principal de agendamento
- `confirmar_postagem.php` - Página de confirmação e salvamento da postagem
- `postagens_agendadas.php` - Lista de postagens agendadas
- `visualizar_postagem.php` - Visualização detalhada de uma postagem
- `webhooks.php` - Gerenciamento de webhooks
- `teste_webhook.php` - Teste de envio de webhook

### Arquivos JavaScript
- `agendamento.js` - Script para gerenciar o formulário de agendamento

### Arquivos de Configuração
- `config.php` - Configurações gerais e funções auxiliares
- `db.php` - Conexão com o banco de dados

## Fluxo de Agendamento

1. Usuário preenche o formulário em `index.php`:
   - Seleciona cliente
   - Escolhe tipo de postagem (Feed, Stories, Feed e Stories)
   - Escolhe formato (Imagem Única, Vídeo Único, Carrossel)
   - Define data e hora de postagem
   - Faz upload dos arquivos
   - Adiciona legenda (opcional)

2. Ao clicar em "Prosseguir para Confirmação", os dados são processados:
   - Os arquivos são enviados para o servidor
   - Os dados são validados
   - O usuário é redirecionado para `confirmar_postagem.php`

3. Em `confirmar_postagem.php`:
   - Os dados são exibidos para confirmação
   - Ao confirmar, os dados são salvos no banco de dados
   - Um webhook é enviado para o servidor de automação externo

4. As postagens agendadas podem ser visualizadas em `postagens_agendadas.php`

## Estrutura do Banco de Dados

### Tabela `postagens`
- `id` - ID da postagem
- `cliente_id` - ID do cliente
- `usuario_id` - ID do usuário que criou a postagem
- `tipo_postagem` - Tipo de postagem (Feed, Stories, Feed e Stories)
- `formato` - Formato da postagem (Imagem Única, Vídeo Único, Carrossel)
- `data_postagem` - Data e hora local da postagem
- `data_postagem_utc` - Data e hora UTC da postagem
- `legenda` - Legenda da postagem
- `arquivos` - JSON com as URLs dos arquivos
- `webhook_status` - Status do envio do webhook (0 = não enviado, 1 = enviado)
- `status` - Status da postagem (Agendado, Publicado, etc.)
- `data_criacao` - Data e hora de criação do registro
- `post_id_unique` - Identificador único da postagem

### Tabela `clientes`
- `id` - ID do cliente
- `nome_cliente` - Nome do cliente
- `instagram` - Instagram do cliente
- `id_instagram` - ID do Instagram
- `id_grupo` - ID do grupo
- `conta_anuncio` - Conta de anúncio
- `link_business` - Link do Business
- `data_criacao` - Data e hora de criação do registro

## Sistema de Webhook

O sistema envia um webhook para o servidor de automação externo quando uma postagem é agendada. O webhook contém:

1. Dados do cliente:
   - `cliente_id`
   - `nome_cliente`
   - `instagram`

2. Dados da postagem:
   - `tipo_postagem`
   - `formato`
   - `data_postagem`
   - `data_postagem_utc` (scheduled_date)
   - `legenda` (caption)
   - `arquivos` (files)

3. Campos extras:
   - `scheduled_date_brazil` - Data no formato brasileiro (dd/mm/yyyy)
   - `scheduled_time_brazil` - Hora no formato brasileiro (hh:mm)

O webhook é enviado para URLs específicas dependendo do formato da postagem:
- Feed: `WEBHOOK_URL_FEED`
- Stories: `WEBHOOK_URL_STORIES`
- Carrossel: `WEBHOOK_URL_CAROUSEL`
- Padrão: `WEBHOOK_URL`

## Correções e Melhorias Implementadas

1. **Correção de Datas e Horários**:
   - Implementação de conversão de UTC para horário local do Brasil (BRT, UTC-3)
   - Uso da coluna `data_postagem_utc` como fallback quando `data_postagem` é inválida

2. **Correção de Chave Estrangeira**:
   - Inclusão do campo `usuario_id` na inserção de novas postagens
   - Obtenção do ID do usuário atual da sessão

3. **Melhoria no Envio de Webhook**:
   - Simplificação do código de envio
   - Preparação específica das URLs dos arquivos
   - Uso de URLs específicas para diferentes formatos de postagem
   - Configuração otimizada do cURL

4. **Correção de Acesso a Mídias**:
   - Modificação para usar o campo `arquivos` em vez de `post_id_unique`
   - Salvamento das URLs dos arquivos como JSON no banco de dados

5. **Correção de Headers Already Sent**:
   - Adição de output buffering no início dos arquivos PHP
   - Modificação da função `redirect()` para lidar com cabeçalhos já enviados

6. **Melhorias na Interface**:
   - Implementação de filtros inteligentes nas listagens
   - Adição de agendamento recorrente
   - Melhoria no sistema de logs

## Fluxo de Processamento de Arquivos

1. Upload do arquivo pelo usuário
2. Processamento do arquivo (se necessário, como no caso de Stories)
3. Geração de nome único no formato: `[tipo]_[cliente]_[YYYYMMDDHHMMSSFFF].[extensao]`
4. Armazenamento em: `/arquivos/[nome do cliente]/[tipo de arquivo]/[nome do arquivo]`
5. Salvamento das URLs completas no banco de dados
6. Envio das URLs para o webhook

## Problemas Conhecidos e Soluções

1. **Problema**: Coluna 'p.webhook_enviado' não encontrada
   - **Solução**: Usar a coluna 'webhook_status' em vez de 'webhook_enviado'

2. **Problema**: Erro ao decodificar o campo `post_id_unique` como JSON
   - **Solução**: Usar o campo `arquivos` para armazenar as URLs dos arquivos

3. **Problema**: Dados de agendamento não encontrados ao redirecionar para confirmação
   - **Solução**: Implementação de um arquivo intermediário para processar os dados do formulário

4. **Problema**: Erro de violação de chave estrangeira ao inserir nova postagem
   - **Solução**: Inclusão do campo `usuario_id` na inserção

5. **Problema**: Datas exibidas como "Data não definida" na tabela de postagens agendadas
   - **Solução**: Uso da coluna `data_postagem_utc` como fallback e conversão para horário local
