# Explicação do Script SQL para Atualização do Banco de Dados

Este documento explica o propósito e o funcionamento do script SQL criado para resolver as inconsistências identificadas no banco de dados do sistema de upload e programação de postagens.

## Visão Geral

O script `atualizar_banco_dados.sql` foi criado para resolver várias inconsistências e problemas identificados na estrutura do banco de dados, com base na análise do arquivo `tabelas_do_sisistema.xml`. As principais correções incluem:

1. Padronização das colunas de webhook
2. Padronização das colunas de nome do cliente
3. Correção de datas inválidas
4. Garantia de integridade referencial
5. Adição de índices para melhorar performance
6. Criação de estruturas para suportar novas funcionalidades

## Detalhamento das Correções

### 1. Padronização das Colunas de Webhook

**Problema**: A tabela `postagens` possui duas colunas redundantes para o status do webhook: `webhook_status` e `webhook_enviado`.

**Solução**:
- Sincroniza os valores entre as duas colunas para garantir consistência
- Adiciona uma coluna `webhook_response` para armazenar a resposta do webhook
- Adiciona uma coluna `webhook_tentativas` para contar o número de tentativas de envio

```sql
UPDATE postagens SET webhook_status = webhook_enviado WHERE webhook_status != webhook_enviado;

ALTER TABLE postagens 
ADD COLUMN IF NOT EXISTS webhook_response VARCHAR(255) DEFAULT NULL;

ALTER TABLE postagens 
ADD COLUMN IF NOT EXISTS webhook_tentativas INT(11) DEFAULT 0;
```

### 2. Padronização das Colunas de Nome do Cliente

**Problema**: A tabela `clientes` possui duas colunas para o nome: `nome_cliente` e `nome`.

**Solução**:
- Copia os valores da coluna `nome` para `nome_cliente` quando `nome_cliente` estiver vazio
- Isso garante que `nome_cliente` sempre tenha um valor, pois é a coluna principal

```sql
UPDATE clientes SET nome_cliente = nome WHERE nome_cliente = '' AND nome IS NOT NULL AND nome != '';
```

### 3. Correção de Datas Inválidas

**Problema**: Alguns registros na tabela `postagens` têm datas inválidas (`0000-00-00 00:00:00`).

**Solução**:
- Utiliza `data_postagem_utc` como fallback para corrigir datas inválidas
- Extrai a hora da `data_postagem` para preencher `hora_postagem` quando necessário

```sql
UPDATE postagens 
SET data_postagem = DATE_FORMAT(STR_TO_DATE(data_postagem_utc, '%Y-%m-%dT%H:%i:%sZ'), '%Y-%m-%d %H:%i:%s') 
WHERE data_postagem = '0000-00-00 00:00:00' AND data_postagem_utc IS NOT NULL;

UPDATE postagens 
SET hora_postagem = TIME(data_postagem) 
WHERE hora_postagem IS NULL OR hora_postagem = '00:00:00';
```

### 4. Garantia de Integridade Referencial

**Problema**: Alguns registros na tabela `postagens` não têm `usuario_id` ou `data_criacao`, causando violações de chave estrangeira.

**Solução**:
- Identifica o ID de um usuário administrador
- Atualiza registros sem `usuario_id` para usar o ID do administrador
- Atualiza registros sem `data_criacao` para usar a data atual

```sql
SET @admin_id = (SELECT id FROM usuarios WHERE tipo_usuario = 'Administrador' ORDER BY id LIMIT 1);

UPDATE postagens SET usuario_id = @admin_id WHERE usuario_id IS NULL OR usuario_id = 0;

UPDATE postagens 
SET data_criacao = NOW() 
WHERE data_criacao IS NULL OR data_criacao = '0000-00-00 00:00:00';
```

### 5. Migração de Dados JSON para Tabela Relacionada

**Problema**: Os arquivos das postagens são armazenados como JSON no campo `arquivos`, mas existe uma tabela `arquivos_postagem` que poderia ser usada para um relacionamento mais estruturado.

**Solução**:
- Cria a tabela `arquivos_postagem` se ela não existir
- Nota: A migração real dos dados JSON para a tabela requer um procedimento armazenado ou script PHP

```sql
CREATE TABLE IF NOT EXISTS arquivos_postagem (
  id INT(11) NOT NULL AUTO_INCREMENT,
  postagem_id INT(11) NOT NULL,
  tipo VARCHAR(20) NOT NULL,
  url VARCHAR(255) NOT NULL,
  ordem INT(11) DEFAULT NULL,
  data_criacao DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY postagem_id (postagem_id),
  CONSTRAINT arquivos_postagem_ibfk_1 FOREIGN KEY (postagem_id) REFERENCES postagens (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 6. Adição de Índices para Melhorar Performance

**Problema**: Faltam índices em colunas frequentemente usadas em consultas, afetando a performance.

**Solução**:
- Adiciona índices para `data_postagem`, `webhook_status` e `tipo_postagem`

```sql
ALTER TABLE postagens ADD INDEX IF NOT EXISTS idx_data_postagem (data_postagem);
ALTER TABLE postagens ADD INDEX IF NOT EXISTS idx_webhook_status (webhook_status);
ALTER TABLE postagens ADD INDEX IF NOT EXISTS idx_tipo_postagem (tipo_postagem);
```

### 7. Adição de Restrições de Chave Estrangeira

**Problema**: Algumas restrições de chave estrangeira podem estar faltando.

**Solução**:
- Adiciona restrições de chave estrangeira para `cliente_id`, `usuario_id` e `agendamento_recorrente_id`

```sql
ALTER TABLE postagens 
ADD CONSTRAINT IF NOT EXISTS postagens_ibfk_1 
FOREIGN KEY (cliente_id) REFERENCES clientes (id);

ALTER TABLE postagens 
ADD CONSTRAINT IF NOT EXISTS postagens_ibfk_2 
FOREIGN KEY (usuario_id) REFERENCES usuarios (id);

ALTER TABLE postagens 
ADD CONSTRAINT IF NOT EXISTS postagens_ibfk_3 
FOREIGN KEY (agendamento_recorrente_id) REFERENCES agendamentos_recorrentes (id) ON DELETE SET NULL;
```

### 8. Adição de Comentários às Colunas

**Problema**: Faltam comentários nas colunas para documentar seu propósito.

**Solução**:
- Adiciona comentários às colunas principais

```sql
ALTER TABLE postagens MODIFY COLUMN webhook_status TINYINT(1) NOT NULL DEFAULT 0 
COMMENT 'Status do envio do webhook (0 = não enviado, 1 = enviado)';

ALTER TABLE postagens MODIFY COLUMN arquivos LONGTEXT DEFAULT NULL 
COMMENT 'JSON com as URLs dos arquivos (legado, usar tabela arquivos_postagem)';
```

### 9. Criação da Tabela de Configurações

**Problema**: Falta uma tabela para armazenar configurações do sistema.

**Solução**:
- Cria a tabela `configuracoes` se ela não existir
- Insere configurações padrão

```sql
CREATE TABLE IF NOT EXISTS configuracoes (
  id INT(11) NOT NULL AUTO_INCREMENT,
  chave VARCHAR(50) NOT NULL,
  valor TEXT NOT NULL,
  descricao VARCHAR(255) DEFAULT NULL,
  data_atualizacao DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_chave (chave)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT IGNORE INTO configuracoes (chave, valor, descricao, data_atualizacao) VALUES
('sistema_nome', 'Sistema de Postagens', 'Nome do sistema exibido no cabeçalho', NOW()),
-- outras configurações...
```

## Como Executar o Script

Para executar o script SQL:

1. Faça backup do banco de dados atual
2. Conecte-se ao banco de dados usando um cliente MySQL/MariaDB
3. Execute o script `atualizar_banco_dados.sql`
4. Verifique se não houve erros durante a execução

```bash
# Exemplo de comando para executar o script via linha de comando
mysql -u usuario -p nome_do_banco < atualizar_banco_dados.sql
```

## Considerações Importantes

- **Backup**: Sempre faça backup do banco de dados antes de executar o script
- **Ambiente de Teste**: Teste o script em um ambiente de desenvolvimento antes de aplicá-lo em produção
- **Verificação**: Após a execução, verifique se as correções foram aplicadas corretamente
- **Migração de JSON**: A migração dos dados JSON para a tabela `arquivos_postagem` requer um script adicional

## Próximos Passos

Após a execução do script, recomendamos:

1. Atualizar o código PHP para usar consistentemente `webhook_status` em vez de `webhook_enviado`
2. Atualizar o código PHP para usar consistentemente `nome_cliente` em vez de `nome`
3. Considerar a migração completa dos dados JSON para a tabela `arquivos_postagem`
4. Implementar validação mais rigorosa para datas e outros campos críticos
5. Documentar as alterações realizadas no esquema do banco de dados
