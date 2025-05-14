<?php
// Iniciar output buffering
ob_start();

// Configurações e conexão com o banco de dados
require_once 'config/config.php';
require_once 'config/db.php';

// Definir cabeçalho como JSON
header('Content-Type: application/json');

// Verificar se o ID do cliente foi fornecido
if (!isset($_GET['client_id']) || empty($_GET['client_id'])) {
    echo json_encode([
        'success' => false,
        'message' => 'ID do cliente não fornecido'
    ]);
    exit;
}

$clientId = intval($_GET['client_id']);

try {
    // Obter conexão com o banco de dados
    $database = new Database();
    $conn = $database->connect();
    
    // Obter contagem total de postagens
    $totalQuery = "SELECT COUNT(*) as total FROM postagens WHERE cliente_id = :client_id";
    $totalStmt = $conn->prepare($totalQuery);
    $totalStmt->bindParam(':client_id', $clientId, PDO::PARAM_INT);
    $totalStmt->execute();
    $totalResult = $totalStmt->fetch(PDO::FETCH_ASSOC);
    $total = $totalResult['total'] ?? 0;
    
    // Obter contagem de feeds
    $feedQuery = "SELECT COUNT(*) as feed_count FROM postagens WHERE cliente_id = :client_id AND (tipo_postagem = 'Feed' OR tipo_postagem = 'feed')";
    $feedStmt = $conn->prepare($feedQuery);
    $feedStmt->bindParam(':client_id', $clientId, PDO::PARAM_INT);
    $feedStmt->execute();
    $feedResult = $feedStmt->fetch(PDO::FETCH_ASSOC);
    $feedCount = $feedResult['feed_count'] ?? 0;
    
    // Obter contagem de stories
    $storyQuery = "SELECT COUNT(*) as story_count FROM postagens WHERE cliente_id = :client_id AND (tipo_postagem = 'Story' OR tipo_postagem = 'story')";
    $storyStmt = $conn->prepare($storyQuery);
    $storyStmt->bindParam(':client_id', $clientId, PDO::PARAM_INT);
    $storyStmt->execute();
    $storyResult = $storyStmt->fetch(PDO::FETCH_ASSOC);
    $storyCount = $storyResult['story_count'] ?? 0;
    
    // Verificar contagem de "Feed e Story"
    $bothQuery = "SELECT COUNT(*) as both_count FROM postagens WHERE cliente_id = :client_id AND (tipo_postagem = 'Feed e Story' OR tipo_postagem = 'feed e story')";
    $bothStmt = $conn->prepare($bothQuery);
    $bothStmt->bindParam(':client_id', $clientId, PDO::PARAM_INT);
    $bothStmt->execute();
    $bothResult = $bothStmt->fetch(PDO::FETCH_ASSOC);
    $bothCount = $bothResult['both_count'] ?? 0;
    
    // Adicionar contagem de "Feed e Story" tanto aos feeds quanto aos stories
    $feedCount += $bothCount;
    $storyCount += $bothCount;
    
    // Retornar os resultados
    echo json_encode([
        'success' => true,
        'total' => $total,
        'feed' => $feedCount,
        'story' => $storyCount
    ]);
    
} catch (PDOException $e) {
    // Retornar erro
    echo json_encode([
        'success' => false,
        'message' => 'Erro ao buscar estatísticas: ' . $e->getMessage()
    ]);
}
