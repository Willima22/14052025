-- Script para adicionar a coluna webhook_tentativas à tabela postagens
ALTER TABLE postagens ADD COLUMN webhook_tentativas INT DEFAULT 0;
