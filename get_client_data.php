<?php
// Iniciar output buffering
ob_start();

// Configurações e conexão com o banco de dados
require_once 'config/config.php';
require_once 'config/db.php';

// Definir cabeçalho como JSON
header('Content-Type: application/json');

// Verificar se o ID do cliente foi fornecido
if (!isset($_GET['id']) || empty($_GET['id'])) {
    echo json_encode([
        'success' => false,
        'message' => 'ID do cliente não fornecido'
    ]);
    exit;
}

$clientId = intval($_GET['id']);

try {
    // Obter conexão com o banco de dados
    $database = new Database();
    $conn = $database->connect();
    
    // Buscar dados do cliente
    $query = "SELECT * FROM clientes WHERE id = :id";
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':id', $clientId, PDO::PARAM_INT);
    $stmt->execute();
    
    $client = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$client) {
        echo json_encode([
            'success' => false,
            'message' => 'Cliente não encontrado'
        ]);
        exit;
    }
    
    // Obter contagem de postagens
    $postCountQuery = "SELECT COUNT(*) as count FROM postagens WHERE cliente_id = :client_id";
    $postStmt = $conn->prepare($postCountQuery);
    $postStmt->bindParam(':client_id', $clientId, PDO::PARAM_INT);
    $postStmt->execute();
    $postCount = $postStmt->fetch(PDO::FETCH_ASSOC)['count'] ?? 0;
    
    // Adicionar contagem de postagens aos dados do cliente
    $client['post_count'] = $postCount;
    
    // Retornar os dados do cliente
    echo json_encode([
        'success' => true,
        'client' => $client
    ]);
    
} catch (PDOException $e) {
    // Retornar erro
    echo json_encode([
        'success' => false,
        'message' => 'Erro ao buscar dados do cliente: ' . $e->getMessage()
    ]);
}
