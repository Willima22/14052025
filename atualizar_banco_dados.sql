-- Script SQL para atualizar o banco de dados e resolver inconsistências
-- Criado em: 14/05/2025

-- 1. Padronização das colunas de webhook na tabela postagens
-- Este bloco atualiza a coluna webhook_status com os valores de webhook_enviado
-- e depois remove a coluna webhook_enviado para evitar duplicidade

-- Primeiro, sincronizamos os valores entre as duas colunas
UPDATE postagens SET webhook_status = webhook_enviado WHERE webhook_status != webhook_enviado;

-- Depois, adicionamos uma coluna para armazenar a resposta do webhook (se ainda não existir)
-- Esta coluna é útil para debug e monitoramento
ALTER TABLE postagens 
ADD COLUMN IF NOT EXISTS webhook_response VARCHAR(255) DEFAULT NULL COMMENT 'Resposta recebida do webhook';

-- Adicionamos uma coluna para contar tentativas de envio (se ainda não existir)
ALTER TABLE postagens 
ADD COLUMN IF NOT EXISTS webhook_tentativas INT(11) DEFAULT 0 COMMENT 'Número de tentativas de envio do webhook';

-- 2. Padronização das colunas de nome na tabela clientes
-- Este bloco copia os valores da coluna nome para nome_cliente quando nome_cliente estiver vazio
-- Isso garante que nome_cliente sempre tenha um valor, pois é a coluna principal

UPDATE clientes SET nome_cliente = nome WHERE nome_cliente = '' AND nome IS NOT NULL AND nome != '';

-- 3. Padronização das colunas de data na tabela postagens
-- Este bloco corrige datas inválidas usando data_postagem_utc como fallback

-- Corrigir datas '0000-00-00 00:00:00' usando data_postagem_utc
UPDATE postagens 
SET data_postagem = DATE_FORMAT(STR_TO_DATE(data_postagem_utc, '%Y-%m-%dT%H:%i:%sZ'), '%Y-%m-%d %H:%i:%s') 
WHERE data_postagem = '0000-00-00 00:00:00' AND data_postagem_utc IS NOT NULL AND data_postagem_utc != '';

-- Extrair a hora da data_postagem para hora_postagem quando hora_postagem estiver vazia
UPDATE postagens 
SET hora_postagem = TIME(data_postagem) 
WHERE hora_postagem IS NULL OR hora_postagem = '00:00:00';

-- 4. Garantir que todos os registros tenham usuario_id
-- Este bloco atualiza registros sem usuario_id para um valor padrão (usuário admin)
-- Isso evita violações de chave estrangeira

-- Primeiro, encontramos o ID do usuário administrador
SET @admin_id = (SELECT id FROM usuarios WHERE tipo_usuario = 'Administrador' ORDER BY id LIMIT 1);

-- Depois, atualizamos os registros sem usuario_id
UPDATE postagens SET usuario_id = @admin_id WHERE usuario_id IS NULL OR usuario_id = 0;

-- 5. Garantir que todos os registros tenham data_criacao
-- Este bloco atualiza registros sem data_criacao para a data atual
-- Isso evita problemas com campos obrigatórios

UPDATE postagens 
SET data_criacao = NOW() 
WHERE data_criacao IS NULL OR data_criacao = '0000-00-00 00:00:00';

-- 6. Migrar dados de arquivos JSON para a tabela arquivos_postagem
-- Este bloco cria a tabela arquivos_postagem se ela não existir
-- e migra os dados do campo arquivos (JSON) para a nova tabela

-- Criar tabela arquivos_postagem se não existir
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

-- Nota: A migração real dos dados JSON para a tabela arquivos_postagem
-- requer um procedimento armazenado ou script PHP para processar o JSON.
-- Isso não pode ser feito diretamente em SQL puro.

-- 7. Adicionar índices para melhorar performance

-- Índice para data_postagem (usado em ordenações e filtros)
ALTER TABLE postagens ADD INDEX IF NOT EXISTS idx_data_postagem (data_postagem);

-- Índice para webhook_status (usado em filtros)
ALTER TABLE postagens ADD INDEX IF NOT EXISTS idx_webhook_status (webhook_status);

-- Índice para tipo_postagem (usado em filtros)
ALTER TABLE postagens ADD INDEX IF NOT EXISTS idx_tipo_postagem (tipo_postagem);

-- 8. Adicionar restrições de chave estrangeira se não existirem

-- Verificar e adicionar FK para cliente_id
ALTER TABLE postagens 
ADD CONSTRAINT IF NOT EXISTS postagens_ibfk_1 
FOREIGN KEY (cliente_id) REFERENCES clientes (id);

-- Verificar e adicionar FK para usuario_id
ALTER TABLE postagens 
ADD CONSTRAINT IF NOT EXISTS postagens_ibfk_2 
FOREIGN KEY (usuario_id) REFERENCES usuarios (id);

-- Verificar e adicionar FK para agendamento_recorrente_id
ALTER TABLE postagens 
ADD CONSTRAINT IF NOT EXISTS postagens_ibfk_3 
FOREIGN KEY (agendamento_recorrente_id) REFERENCES agendamentos_recorrentes (id) ON DELETE SET NULL;

-- 9. Adicionar comentários às colunas para melhor documentação

ALTER TABLE postagens MODIFY COLUMN webhook_status TINYINT(1) NOT NULL DEFAULT 0 
COMMENT 'Status do envio do webhook (0 = não enviado, 1 = enviado)';

ALTER TABLE postagens MODIFY COLUMN arquivos LONGTEXT DEFAULT NULL 
COMMENT 'JSON com as URLs dos arquivos (legado, usar tabela arquivos_postagem)';

ALTER TABLE postagens MODIFY COLUMN post_id_unique VARCHAR(100) NOT NULL 
COMMENT 'Identificador único da postagem usado para evitar duplicações';

-- 10. Criar tabela de configurações se não existir
CREATE TABLE IF NOT EXISTS configuracoes (
  id INT(11) NOT NULL AUTO_INCREMENT,
  chave VARCHAR(50) NOT NULL,
  valor TEXT NOT NULL,
  descricao VARCHAR(255) DEFAULT NULL,
  data_atualizacao DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_chave (chave)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Inserir configurações padrão se não existirem
INSERT IGNORE INTO configuracoes (chave, valor, descricao, data_atualizacao) VALUES
('sistema_nome', 'Sistema de Postagens', 'Nome do sistema exibido no cabeçalho', NOW()),
('empresa_nome', 'Minha Empresa', 'Nome da empresa exibido no rodapé', NOW()),
('periodicidade_backup', 'semanal', 'Periodicidade do backup automático (diario, semanal, mensal)', NOW()),
('tempo_sessao', '120', 'Tempo de sessão em minutos', NOW()),
('webhook_url', 'https://automacao2.aw7agencia.com.br/webhook/agendarpostagem', 'URL padrão para envio de webhooks', NOW());
