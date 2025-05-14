<?php
// Iniciar output buffering
ob_start();

// Configurações de cabeçalho para API
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Se for uma requisição OPTIONS (preflight), retornar apenas os headers
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Verificar se é uma requisição POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); // Method Not Allowed
    echo json_encode(['error' => 'Método não permitido']);
    exit;
}

// Incluir arquivos de configuração
require_once '../config/config.php';
require_once '../config/db.php';

// Obter o corpo da requisição
$requestBody = file_get_contents('php://input');
$data = json_decode($requestBody, true);

// Verificar se os dados foram recebidos corretamente
if (empty($data) || !is_array($data)) {
    http_response_code(400); // Bad Request
    echo json_encode(['error' => 'Dados inválidos']);
    error_log('Webhook Error: Dados inválidos ou vazios');
    exit;
}

// Registrar os dados recebidos para debug
error_log('Webhook recebido: ' . json_encode($data));

try {
    // Conectar ao banco de dados
    $database = new Database();
    $conn = $database->connect();
    
    // Verificar se a postagem já existe pelo post_id
    if (isset($data['post_id']) && !empty($data['post_id'])) {
        $query = "SELECT id FROM postagens WHERE id = :post_id";
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':post_id', $data['post_id']);
        $stmt->execute();
        
        if ($stmt->rowCount() > 0) {
            // A postagem já existe, atualizar
            $postagem = $stmt->fetch(PDO::FETCH_ASSOC);
            $postId = $postagem['id'];
            
            // Atualizar a postagem existente
            $query = "UPDATE postagens SET 
                      status = 'Agendado',
                      webhook_response = :webhook_response,
                      webhook_enviado = 1,
                      updated_at = NOW()
                      WHERE id = :post_id";
                      
            $stmt = $conn->prepare($query);
            $webhookResponse = json_encode(['success' => true, 'message' => 'Postagem atualizada com sucesso']);
            $stmt->bindParam(':webhook_response', $webhookResponse);
            $stmt->bindParam(':post_id', $postId);
            $stmt->execute();
            
            // Responder com sucesso
            http_response_code(200);
            echo json_encode(['success' => true, 'message' => 'Postagem atualizada com sucesso', 'post_id' => $postId]);
        } else {
            // A postagem não existe, criar uma nova
            // Extrair dados do cliente
            $clienteId = $data['cliente_id'] ?? null;
            $tipoPostagem = $data['post_type'] ?? null;
            $formato = $data['format'] ?? null;
            $dataPostagem = $data['scheduled_date'] ?? null;
            $dataPostagemUTC = $data['scheduled_date'] ?? null;
            $legenda = $data['caption'] ?? null;
            $arquivos = json_encode($data['files'] ?? []);
            
            // Validar dados obrigatórios
            if (!$clienteId || !$tipoPostagem || !$formato || !$dataPostagem) {
                throw new Exception('Dados obrigatórios não fornecidos');
            }
            
            // Inserir nova postagem
            $query = "INSERT INTO postagens (
                      cliente_id, tipo_postagem, formato, data_postagem, data_postagem_utc, 
                      legenda, arquivos, status, webhook_response, webhook_enviado, data_criacao
                      ) VALUES (
                      :cliente_id, :tipo_postagem, :formato, :data_postagem, :data_postagem_utc,
                      :legenda, :arquivos, 'Agendado', :webhook_response, 1, NOW()
                      )";
                      
            $stmt = $conn->prepare($query);
            $stmt->bindParam(':cliente_id', $clienteId);
            $stmt->bindParam(':tipo_postagem', $tipoPostagem);
            $stmt->bindParam(':formato', $formato);
            $stmt->bindParam(':data_postagem', $dataPostagem);
            $stmt->bindParam(':data_postagem_utc', $dataPostagemUTC);
            $stmt->bindParam(':legenda', $legenda);
            $stmt->bindParam(':arquivos', $arquivos);
            $webhookResponse = json_encode(['success' => true, 'message' => 'Postagem criada com sucesso']);
            $stmt->bindParam(':webhook_response', $webhookResponse);
            $stmt->execute();
            
            $postId = $conn->lastInsertId();
            
            // Responder com sucesso
            http_response_code(201); // Created
            echo json_encode(['success' => true, 'message' => 'Postagem criada com sucesso', 'post_id' => $postId]);
        }
    } else {
        throw new Exception('ID da postagem não fornecido');
    }
} catch (Exception $e) {
    // Registrar erro
    error_log('Webhook Error: ' . $e->getMessage());
    
    // Responder com erro
    http_response_code(500);
    echo json_encode(['error' => 'Erro ao processar webhook: ' . $e->getMessage()]);
}
