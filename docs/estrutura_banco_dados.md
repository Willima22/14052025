# Estrutura do Banco de Dados

Este documento descreve a estrutura real do banco de dados utilizada pelo sistema de upload e programação de postagens, com base na análise do arquivo `tabelas_do_sisistema.xml`.

## Tabelas Principais

### Tabela `postagens`

Esta tabela armazena todas as informações relacionadas às postagens agendadas.

| Coluna | Tipo | Descrição |
|--------|------|----------|
| id | int(11) | ID da postagem (chave primária) |
| cliente_id | int(11) | ID do cliente (chave estrangeira para tabela clientes) |
| agendamento_recorrente_id | int(11) | ID do agendamento recorrente (pode ser NULL) |
| post_id_unique | varchar(100) | Identificador único da postagem (chave única) |
| tipo_postagem | enum('feed','stories','feed_stories') | Tipo de postagem |
| formato | enum('imagem_unica','video_unico','carrossel') | Formato da postagem |
| data_postagem | datetime | Data e hora local da postagem |
| hora_postagem | time | Hora da postagem (separada da data) |
| data_postagem_utc | varchar(50) | Data e hora UTC da postagem no formato ISO |
| legenda | text | Legenda da postagem |
| feed | varchar(255) | Caminho para o arquivo de feed (pode ser NULL) |
| stories | varchar(255) | Caminho para o arquivo de stories (pode ser NULL) |
| webhook_status | tinyint(1) | Status do envio do webhook (0 = não enviado, 1 = enviado) |
| webhook_enviado | tinyint(1) | Status do envio do webhook (duplicado, 0 = não enviado, 1 = enviado) |
| webhook_response | varchar(255) | Resposta do webhook (pode ser NULL) |
| data_criacao | datetime | Data e hora de criação do registro |
| created_at | datetime | Data e hora de criação (duplicado, pode ser NULL) |
| usuario_id | int(11) | ID do usuário que criou a postagem |
| status | varchar(50) | Status da postagem (Agendado, Publicado, etc.) |
| arquivos | longtext | JSON com as URLs dos arquivos |
| webhook_tentativas | int(11) | Número de tentativas de envio do webhook (padrão 0) |

### Tabela `clientes`

Esta tabela armazena informações sobre os clientes.

| Coluna | Tipo | Descrição |
|--------|------|----------|
| id | int(11) | ID do cliente (chave primária) |
| nome_cliente | varchar(100) | Nome do cliente (campo principal para o nome) |
| logomarca | varchar(255) | Caminho para o arquivo de logomarca do cliente (pode ser NULL) |
| instagram | varchar(50) | Instagram do cliente |
| id_instagram | varchar(50) | ID do Instagram |
| id_grupo | varchar(50) | ID do grupo |
| conta_anuncio | varchar(100) | Conta de anúncio |
| link_business | varchar(255) | Link do Business |
| data_criacao | timestamp | Data e hora de criação do registro |
| nome | varchar(255) | Nome alternativo (campo duplicado, pode ser NULL) |

### Tabela `usuarios`

Esta tabela armazena informações sobre os usuários do sistema.

| Coluna | Tipo | Descrição |
|--------|------|----------|
| id | int(11) | ID do usuário (chave primária) |
| nome | varchar(255) | Nome do usuário |
| email | varchar(255) | Email do usuário (único) |
| cpf | varchar(20) | CPF do usuário |
| usuario | varchar(100) | Nome de usuário para login (único) |
| senha | varchar(255) | Senha criptografada |
| foto | varchar(255) | Caminho para a foto do usuário (pode ser NULL) |
| tipo_usuario | enum('Administrador','Editor') | Tipo de usuário (padrão 'Editor') |
| ultimo_login | datetime | Data e hora do último login (pode ser NULL) |
| senha_alterada | tinyint(1) | Indica se a senha foi alterada (0 = não, 1 = sim) |
| data_criacao | datetime | Data e hora de criação do registro |
| foto_perfil | varchar(255) | Nome do arquivo da foto de perfil (pode ser NULL) |

### Tabela `historico` (Logs)

Esta tabela armazena registros de atividades no sistema.

| Coluna | Tipo | Descrição |
|--------|------|----------|
| id | int(11) | ID do log (chave primária) |
| usuario_id | int(11) | ID do usuário que realizou a ação |
| acao | varchar(100) | Descrição da ação realizada |
| detalhes | text | Detalhes adicionais da ação |
| ip | varchar(45) | Endereço IP da tentativa |
| data_hora | datetime | Data e hora da ação |
| usuario_nome | varchar(100) | Nome do usuário (pode ser NULL) |
| modulo | varchar(100) | Módulo do sistema onde a ação foi realizada (pode ser NULL) |

### Tabela `arquivos_postagem`

Esta tabela armazena os arquivos associados a cada postagem.

| Coluna | Tipo | Descrição |
|--------|------|----------|
| id | int(11) | ID do arquivo (chave primária) |
| postagem_id | int(11) | ID da postagem (chave estrangeira) |
| tipo | varchar(20) | Tipo do arquivo |
| url | varchar(255) | URL do arquivo |
| ordem | int(11) | Ordem do arquivo (para carrosséis) |
| data_criacao | datetime | Data e hora de criação do registro |

### Tabela `configuracoes`

Esta tabela armazena configurações do sistema.

| Coluna | Tipo | Descrição |
|--------|------|----------|
| id | int(11) | ID da configuração (chave primária) |
| chave | varchar(50) | Nome da configuração (único) |
| valor | text | Valor da configuração |
| descricao | varchar(255) | Descrição da configuração |
| data_atualizacao | datetime | Data e hora da última atualização |

### Tabela `agendamentos_recorrentes`

Esta tabela armazena informações sobre agendamentos recorrentes.

| Coluna | Tipo | Descrição |
|--------|------|----------|
| id | int(11) | ID do agendamento (chave primária) |
| cliente_id | int(11) | ID do cliente |
| tipo_postagem | varchar(20) | Tipo de postagem |
| formato | varchar(20) | Formato da postagem |
| frequencia | varchar(20) | Frequência (diario, semanal, mensal) |
| dia_semana | int(1) | Dia da semana (0=domingo, 1=segunda, ..., 6=sábado) |
| dia_mes | int(2) | Dia do mês (1-31) |
| hora | time | Hora do agendamento |
| legenda | text | Legenda da postagem |
| hashtags | text | Hashtags da postagem |
| arquivo_path | varchar(255) | Caminho para o arquivo |
| ativo | tinyint(1) | Status do agendamento (0=inativo, 1=ativo) |
| usuario_id | int(11) | ID do usuário que criou o agendamento |
| data_criacao | datetime | Data e hora de criação do registro |
| ultima_execucao | datetime | Data e hora da última execução |
| proxima_execucao | datetime | Data e hora da próxima execução |

### Tabela `login_attempts`

Esta tabela armazena tentativas de login no sistema.

| Coluna | Tipo | Descrição |
|--------|------|----------|
| id | int(11) | ID da tentativa (chave primária) |
| username | varchar(50) | Nome de usuário tentado |
| ip | varchar(45) | Endereço IP da tentativa |
| success | tinyint(1) | Status da tentativa (0=falha, 1=sucesso) |
| timestamp | datetime | Data e hora da tentativa |

## Relacionamentos

- **postagens.cliente_id** → **clientes.id**: Cada postagem está associada a um cliente.
- **postagens.usuario_id** → **usuarios.id**: Cada postagem é criada por um usuário.
- **postagens.agendamento_recorrente_id** → **agendamentos_recorrentes.id**: Postagens podem estar associadas a um agendamento recorrente.
- **arquivos_postagem.postagem_id** → **postagens.id**: Cada arquivo está associado a uma postagem.
- **historico.usuario_id** → **usuarios.id**: Cada registro de histórico está associado a um usuário.

## Problemas Identificados e Correções

### 1. Duplicidade de colunas para webhook

**Problema**: A tabela `postagens` possui duas colunas para o status do webhook: `webhook_status` e `webhook_enviado`, ambas do tipo `tinyint(1)`. Isso causa confusão no código, onde algumas consultas usam `webhook_enviado` e outras usam `webhook_status`.

**Correção**: Padronizar o uso de uma única coluna em todo o código. Recomendamos usar `webhook_status` por ser mais descritivo.

### 2. Duplicidade de colunas para nome do cliente

**Problema**: A tabela `clientes` possui duas colunas para nome: `nome_cliente` e `nome`. O formulário de cadastro estava salvando no campo `nome`, mas a visualização estava exibindo o campo `nome_cliente`.

**Correção**: Usar consistentemente o campo `nome_cliente` em todas as consultas e formulários, pois é o campo principal para o nome do cliente.

### 3. Campos de data e hora separados

**Problema**: A tabela `postagens` possui campos separados para data (`data_postagem`) e hora (`hora_postagem`), além do campo `data_postagem_utc` para o formato UTC. Isso pode causar confusão e inconsistências.

**Correção**: 
- Usar a combinação de `data_postagem` e `hora_postagem` para exibir a data e hora local
- Usar `data_postagem_utc` como fallback quando os outros campos forem inválidos
- Converter o formato UTC para o horário local do Brasil (BRT, -3 horas) quando necessário

### 4. Campos obrigatórios e chaves estrangeiras

**Problema**: Algumas inserções não incluíam todos os campos obrigatórios, como `usuario_id`, causando violações de chave estrangeira.

**Correção**:
- Garantir que todos os campos obrigatórios sejam incluídos nas consultas de inserção
- Obter o ID do usuário atual da sessão: `$usuario_id = $_SESSION['user_id'] ?? null;`
- Adicionar o campo `data_criacao` com a data e hora atuais: `$data_criacao = date('Y-m-d H:i:s');`
- Incluir os campos `usuario_id` e `data_criacao` em todas as consultas SQL de inserção

## Consultas SQL Comuns

### Listar Postagens Agendadas

```sql
SELECT p.*, c.nome_cliente, c.instagram, u.nome as usuario_nome
FROM postagens p
LEFT JOIN clientes c ON p.cliente_id = c.id
LEFT JOIN usuarios u ON p.usuario_id = u.id
ORDER BY p.data_postagem DESC
```

### Buscar Detalhes de uma Postagem

```sql
SELECT p.*, c.nome_cliente, c.instagram, u.nome as nome_usuario
FROM postagens p
JOIN clientes c ON p.cliente_id = c.id
JOIN usuarios u ON p.usuario_id = u.id
WHERE p.id = :id
```

### Inserir Nova Postagem

```sql
INSERT INTO postagens (
    cliente_id, 
    tipo_postagem, 
    formato, 
    data_postagem, 
    hora_postagem,
    data_postagem_utc, 
    legenda, 
    post_id_unique, 
    webhook_status, 
    webhook_enviado,
    data_criacao, 
    usuario_id, 
    arquivos
) VALUES (
    :cliente_id, 
    :tipo_postagem, 
    :formato, 
    :data_postagem, 
    :hora_postagem,
    :data_postagem_utc, 
    :legenda, 
    :post_id_unique, 
    0, 
    0,
    :data_criacao, 
    :usuario_id, 
    :arquivos
)
```

### Atualizar Status do Webhook

```sql
UPDATE postagens 
SET webhook_status = 1, webhook_enviado = 1 
WHERE id = :id
```

### Inserir Arquivo de Postagem

```sql
INSERT INTO arquivos_postagem (
    postagem_id,
    tipo,
    url,
    ordem,
    data_criacao
) VALUES (
    :postagem_id,
    :tipo,
    :url,
    :ordem,
    :data_criacao
)
```

### Buscar Arquivos de uma Postagem

```sql
SELECT * FROM arquivos_postagem
WHERE postagem_id = :postagem_id
ORDER BY ordem ASC
```

## Recomendações para Melhorias

1. **Eliminar Duplicidade de Colunas**:
   - Decidir entre `webhook_status` e `webhook_enviado` e usar apenas uma coluna
   - Decidir entre `nome_cliente` e `nome` na tabela `clientes` e usar apenas uma coluna
   - Decidir entre `data_criacao` e `created_at` na tabela `postagens` e usar apenas uma coluna

2. **Padronizar Tipos de Dados**:
   - Usar `enum` para campos com valores predefinidos (como já está sendo feito para `tipo_postagem` e `formato`)
   - Usar tipos de dados consistentes para datas e horas em todas as tabelas

3. **Decidir entre JSON e Tabela Relacionada**:
   - Decidir se os arquivos das postagens serão armazenados como JSON no campo `arquivos` ou na tabela `arquivos_postagem`
   - Padronizar o acesso aos arquivos em todo o código

4. **Otimizar Consultas SQL**:
   - Usar `LEFT JOIN` em vez de `JOIN` quando apropriado para evitar perder registros
   - Adicionar índices para colunas frequentemente usadas em consultas WHERE e JOIN

5. **Implementar Validação de Dados**:
   - Validar datas e horas antes de inserir no banco de dados
   - Garantir que todos os campos obrigatórios sejam preenchidos

6. **Melhorar o Sistema de Logs**:
   - Padronizar o uso das tabelas `historico` e `logs`
   - Registrar informações consistentes em todas as ações

7. **Implementar Controle de Versão do Banco de Dados**:
   - Usar migrations para controlar alterações no esquema
   - Documentar todas as alterações no esquema do banco de dados

8. **Melhorar o Sistema de Backup**:
   - Usar a tabela `configuracoes` para controlar a periodicidade do backup
   - Implementar backup automático conforme configurado
