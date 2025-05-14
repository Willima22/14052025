<?php
// Iniciar output buffering
ob_start();

require_once 'config/config.php';
require_once 'config/db.php';
require_once 'includes/auth.php';

// Verifica se o usuário está logado
if (!isset($_SESSION['user_id']) && basename($_SERVER['PHP_SELF']) !== 'login.php') {
    redirect('login.php');
}

// Define tempo de login se não estiver setado
if (isset($_SESSION['user_id']) && !isset($_SESSION['login_time'])) {
    $_SESSION['login_time'] = time();
    $_SESSION['user_ip'] = $_SERVER['REMOTE_ADDR'];
}

// Verifica inatividade (5 minutos)
if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity'] > 300)) {
    session_unset();
    session_destroy();
    redirect('login.php?reason=inactivity');
}
$_SESSION['last_activity'] = time();

// Calcula o tempo logado
$loginTime = $_SESSION['login_time'] ?? time();
$timeLoggedIn = time() - $loginTime;
$hours = floor($timeLoggedIn / 3600);
$minutes = floor(($timeLoggedIn % 3600) / 60);
$seconds = $timeLoggedIn % 60;
$timeLoggedInString = sprintf("%02d:%02d:%02d", $hours, $minutes, $seconds);

// Agora carrega o HTML
require_once 'includes/header.php';

// Incluir CSS específico para cartões de clientes
echo '<link rel="stylesheet" href="assets/css/client-cards.css">';

// Check if user has permission
requirePermission('Editor');

// Get database connection
$database = new Database();
$conn = $database->connect();

// Handle delete request
if (isset($_POST['delete']) && isset($_POST['client_id'])) {
    try {
        $query = "DELETE FROM clientes WHERE id = :id";
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':id', $_POST['client_id']);
        $stmt->execute();
        
        setFlashMessage('success', 'Cliente excluído com sucesso!');
    } catch (PDOException $e) {
        error_log("Database Error: " . $e->getMessage());
        
        if ($e->getCode() == '23000') { // Foreign key constraint error
            setFlashMessage('danger', 'Não é possível excluir este cliente porque existem postagens associadas a ele.');
        } else {
            setFlashMessage('danger', 'Erro ao excluir cliente: ' . $e->getMessage());
        }
    }
    
    // Redirect to refresh the page
    redirect('clientes_visualizar.php');
}

// Handle toggle active status
if (isset($_POST['toggle_status']) && isset($_POST['client_id'])) {
    try {
        // First get current status
        $query = "SELECT ativo FROM clientes WHERE id = :id";
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':id', $_POST['client_id']);
        $stmt->execute();
        $client = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Toggle status
        $newStatus = ($client && isset($client['ativo'])) ? !$client['ativo'] : 1;
        
        $query = "UPDATE clientes SET ativo = :ativo WHERE id = :id";
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':id', $_POST['client_id']);
        $stmt->bindParam(':ativo', $newStatus, PDO::PARAM_INT);
        $stmt->execute();
        
        $statusText = $newStatus ? 'ativado' : 'desativado';
        setFlashMessage('success', "Cliente {$statusText} com sucesso!");
    } catch (PDOException $e) {
        error_log("Database Error: " . $e->getMessage());
        setFlashMessage('danger', 'Erro ao alterar status do cliente: ' . $e->getMessage());
    }
    
    // Redirect to refresh the page
    redirect('clientes_visualizar.php');
}

// Get pagination parameters
$page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
$perPage = 100; // Alterado para 100 clientes por página
$offset = ($page - 1) * $perPage;

// Get filter parameters
$search = isset($_GET['search']) ? sanitize($_GET['search']) : '';
$statusFilter = isset($_GET['status']) ? $_GET['status'] : '';
$postsFilter = isset($_GET['posts']) ? $_GET['posts'] : '';

// Get sort parameters
$sortColumn = isset($_GET['sort']) ? sanitize($_GET['sort']) : 'nome_cliente';
$sortDirection = isset($_GET['direction']) && strtolower($_GET['direction']) === 'desc' ? 'DESC' : 'ASC';

// Valid columns for sorting
$validColumns = ['nome_cliente', 'instagram', 'id_grupo', 'id_instagram', 'conta_anuncio'];
if (!in_array($sortColumn, $validColumns)) {
    $sortColumn = 'nome_cliente';
}

// Build the query
$whereClause = "";
$queryParams = [];
$conditions = [];

// Add search condition if search parameter exists
if (!empty($search)) {
    $conditions[] = "(nome_cliente LIKE ? OR instagram LIKE ?)";
    $searchParam = "%{$search}%";
    $queryParams[] = $searchParam;
    $queryParams[] = $searchParam;
}

// Add status filter
if ($statusFilter !== '') {
    $conditions[] = "ativo = ?";
    $queryParams[] = (int)$statusFilter;
}

// Combine all conditions
if (!empty($conditions)) {
    $whereClause = " WHERE " . implode(" AND ", $conditions);
}

// Base queries
$countQuery = "SELECT COUNT(*) as total FROM clientes" . $whereClause;
$query = "SELECT * FROM clientes" . $whereClause;

// Add order by
$query .= " ORDER BY {$sortColumn} {$sortDirection}";

// Execute count query
$countStmt = $conn->prepare($countQuery);
if (!empty($queryParams)) {
    $countStmt->execute($queryParams);
} else {
    $countStmt->execute();
}
$totalClients = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

// Calculate total pages
$totalPages = ceil($totalClients / $perPage);

// Add limit for pagination
$query .= " LIMIT ?, ?";
$queryParams[] = $offset;
$queryParams[] = $perPage;

// Get post count for each client before applying post filter
$clientPostCountsQuery = "SELECT cliente_id, COUNT(*) as count FROM postagens GROUP BY cliente_id";
$stmtCounts = $conn->prepare($clientPostCountsQuery);
$stmtCounts->execute();
$postCountsResult = $stmtCounts->fetchAll(PDO::FETCH_ASSOC);

$clientPostCounts = [];
foreach ($postCountsResult as $countRow) {
    $clientPostCounts[$countRow['cliente_id']] = $countRow['count'];
}

// Apply posts filter if needed
if ($postsFilter === 'with') {
    $clientIdsWithPosts = array_keys(array_filter($clientPostCounts, function($count) {
        return $count > 0;
    }));
    
    if (!empty($clientIdsWithPosts)) {
        $placeholders = implode(',', array_fill(0, count($clientIdsWithPosts), '?'));
        if (empty($conditions)) {
            $whereClause = " WHERE id IN ($placeholders)";
        } else {
            $whereClause .= " AND id IN ($placeholders)";
        }
        $queryParams = array_merge($queryParams, $clientIdsWithPosts);
    } else {
        // No clients with posts, force empty result
        if (empty($conditions)) {
            $whereClause = " WHERE 1=0";
        } else {
            $whereClause .= " AND 1=0";
        }
    }
} elseif ($postsFilter === 'without') {
    $clientIdsWithPosts = array_keys(array_filter($clientPostCounts, function($count) {
        return $count > 0;
    }));
    
    if (!empty($clientIdsWithPosts)) {
        $placeholders = implode(',', array_fill(0, count($clientIdsWithPosts), '?'));
        if (empty($conditions)) {
            $whereClause = " WHERE id NOT IN ($placeholders)";
        } else {
            $whereClause .= " AND id NOT IN ($placeholders)";
        }
        $queryParams = array_merge($queryParams, $clientIdsWithPosts);
    }
}

// Execute main query
$stmt = $conn->prepare($query);
$stmt->execute($queryParams);
$clients = $stmt->fetchAll(PDO::FETCH_ASSOC);
?>

<div class="container">
    <div class="row mb-4">
        <div class="col-md-8">
            <h1 class="mb-3">Clientes</h1>
            <p class="text-secondary">Visualize e gerencie todos os clientes cadastrados no sistema.</p>
        </div>
        <div class="col-md-4 text-end d-flex align-items-center justify-content-end">
            <a href="clientes.php" class="btn btn-primary">
                <i class="fas fa-plus-circle me-2"></i> Novo Cliente
            </a>
        </div>
    </div>
    
    <div class="row mb-4">
        <div class="col-md-12">
            <div class="card">
                <div class="card-body">
                    <form id="searchForm" action="clientes_visualizar.php" method="GET" class="row g-3">
                        <div class="col-md-6">
                            <div class="input-group">
                                <input type="text" class="form-control" placeholder="Buscar por nome ou Instagram..." name="search" id="searchInput" value="<?= htmlspecialchars($search) ?>">
                                <button class="btn btn-primary" type="submit">
                                    <i class="fas fa-search"></i>
                                </button>
                            </div>
                        </div>
                        
                        <div class="col-md-3">
                            <select class="form-select" name="status" id="statusFilter">
                                <option value="" <?= !isset($_GET['status']) || $_GET['status'] === '' ? 'selected' : '' ?>>Todos os Status</option>
                                <option value="1" <?= isset($_GET['status']) && $_GET['status'] === '1' ? 'selected' : '' ?>>Ativos</option>
                                <option value="0" <?= isset($_GET['status']) && $_GET['status'] === '0' ? 'selected' : '' ?>>Inativos</option>
                            </select>
                        </div>
                        
                        <div class="col-md-3">
                            <select class="form-select" name="posts" id="postsFilter">
                                <option value="" <?= !isset($_GET['posts']) || $_GET['posts'] === '' ? 'selected' : '' ?>>Todas as Postagens</option>
                                <option value="with" <?= isset($_GET['posts']) && $_GET['posts'] === 'with' ? 'selected' : '' ?>>Com Postagens</option>
                                <option value="without" <?= isset($_GET['posts']) && $_GET['posts'] === 'without' ? 'selected' : '' ?>>Sem Postagens</option>
                            </select>
                        </div>
                        
                        <div class="col-12 mt-3 d-flex justify-content-end">
                            <?php if (!empty($search) || isset($_GET['status']) || isset($_GET['posts'])): ?>
                            <a href="clientes_visualizar.php" class="btn btn-outline-secondary me-2">
                                <i class="fas fa-times me-2"></i> Limpar Filtros
                            </a>
                            <?php endif; ?>
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-filter me-2"></i> Aplicar Filtros
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
    
    <div class="row">
        <div class="col-md-12">
            <div class="card">
                <div class="card-header">
                    <div class="d-flex justify-content-between align-items-center">
                        <strong>Lista de Clientes</strong>
                        <span class="badge bg-primary"><?= $totalClients ?> clientes</span>
                    </div>
                </div>
                <div class="card-body">
                    <?php if (count($clients) > 0): ?>
                    <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 row-cols-xl-4 g-4" id="clientsCards">
                        <?php foreach ($clients as $client): ?>
                        <?php $isActive = isset($client['ativo']) ? (bool)$client['ativo'] : true; ?>
                        <div class="col client-card-col" data-name="<?= strtolower(htmlspecialchars($client['nome_cliente'])) ?>" data-instagram="<?= strtolower(htmlspecialchars($client['instagram'])) ?>">
                            <div class="card h-100 <?= $isActive ? '' : 'border-danger' ?>">
                                <div class="card-header bg-light d-flex justify-content-between align-items-center">
                                    <h5 class="card-title mb-0"><?= htmlspecialchars($client['nome_cliente']) ?></h5>
                                    <span class="badge bg-secondary"><?= $clientPostCounts[$client['id']] ?? 0 ?> postagens</span>
                                </div>
                                
                                <div class="card-body">
                                    <div class="text-center mb-3">
                                        <?php if (!empty($client['logomarca'])): ?>
                                            <img src="uploads/logomarcas/<?= htmlspecialchars($client['logomarca']) ?>" class="img-fluid client-logo" alt="Logo <?= htmlspecialchars($client['nome_cliente']) ?>" style="max-height: 100px;">
                                        <?php else: ?>
                                            <div class="client-placeholder-logo d-flex align-items-center justify-content-center bg-light rounded" style="height: 100px;">
                                                <i class="fas fa-building fa-3x text-secondary"></i>
                                            </div>
                                        <?php endif; ?>
                                    </div>
                                    
                                    <div class="client-info">
                                        <p class="mb-2">
                                            <i class="fab fa-instagram text-danger me-2"></i>
                                            <a href="https://instagram.com/<?= htmlspecialchars($client['instagram']) ?>" target="_blank" class="text-decoration-none">
                                                @<?= htmlspecialchars($client['instagram']) ?>
                                            </a>
                                        </p>
                                        
                                        <?php if (!empty($client['id_grupo']) && $client['id_grupo'] != 'Não tem'): ?>
                                        <p class="mb-2">
                                            <i class="fas fa-users text-primary me-2"></i>
                                            <small class="text-muted">Grupo:</small> 
                                            <span class="text-truncate d-inline-block" style="max-width: 150px;" title="<?= htmlspecialchars($client['id_grupo']) ?>">
                                                <?= htmlspecialchars($client['id_grupo']) ?>
                                            </span>
                                        </p>
                                        <?php endif; ?>
                                        
                                        <?php if (!empty($client['conta_anuncio']) && $client['conta_anuncio'] != 'Não tem'): ?>
                                        <p class="mb-2">
                                            <i class="fas fa-ad text-success me-2"></i>
                                            <small class="text-muted">Anúncio:</small> 
                                            <span class="text-truncate d-inline-block" style="max-width: 150px;" title="<?= htmlspecialchars($client['conta_anuncio']) ?>">
                                                <?= htmlspecialchars($client['conta_anuncio']) ?>
                                            </span>
                                        </p>
                                        <?php endif; ?>
                                    </div>
                                </div>
                                
                                <div class="card-footer bg-transparent">
                                    <div class="d-flex justify-content-between">
                                        <div>
                                            <!-- Visualizar -->
                                            <button type="button" class="btn btn-view btn-sm" 
                                                    data-bs-toggle="modal" 
                                                    data-bs-target="#viewModal" 
                                                    data-client-id="<?= $client['id'] ?>"
                                                    data-client-name="<?= htmlspecialchars($client['nome_cliente']) ?>"
                                                    data-client-instagram="<?= htmlspecialchars($client['instagram']) ?>"
                                                    data-client-id-instagram="<?= htmlspecialchars($client['id_instagram']) ?>"
                                                    data-client-id-grupo="<?= htmlspecialchars($client['id_grupo']) ?>"
                                                    data-client-conta-anuncio="<?= htmlspecialchars($client['conta_anuncio']) ?>"
                                                    data-client-link-business="<?= htmlspecialchars($client['link_business']) ?>"
                                                    data-client-data-criacao="<?= htmlspecialchars($client['data_criacao']) ?>"
                                                    data-client-logomarca="<?= htmlspecialchars($client['logomarca'] ?? '') ?>"
                                                    data-client-ativo="<?= (int)($client['ativo'] ?? 1) ?>"
                                                    data-client-post-count="<?= $clientPostCounts[$client['id']] ?? 0 ?>"
                                                    title="Visualizar">
                                                <i class="fas fa-eye"></i>
                                            </button>
                                            
                                            <!-- Editar -->
                                            <a href="clientes.php?id=<?= $client['id'] ?>" class="btn btn-edit btn-sm ms-1" title="Editar">
                                                <i class="fas fa-edit"></i>
                                            </a>
                                            
                                            <!-- Histórico -->
                                            <button type="button" class="btn btn-history btn-sm ms-1" 
                                                    data-bs-toggle="modal" 
                                                    data-bs-target="#historyModal" 
                                                    data-client-id="<?= $client['id'] ?>"
                                                    data-client-name="<?= htmlspecialchars($client['nome_cliente']) ?>"
                                                    title="Histórico">
                                                <i class="fas fa-history"></i>
                                            </button>
                                        </div>
                                        
                                        <div>
                                            <!-- Copiar Dados -->
                                            <button type="button" class="btn btn-copy btn-sm" 
                                                    onclick="copyClientData('<?= htmlspecialchars($client['nome_cliente']) ?>', '<?= htmlspecialchars($client['instagram']) ?>', '<?= htmlspecialchars($client['id_instagram']) ?>', '<?= htmlspecialchars($client['id_grupo']) ?>')"
                                                    title="Copiar Dados">
                                                <i class="fas fa-copy"></i>
                                            </button>
                                            
                                            <!-- Alternar Status -->
                                            <form method="post" action="clientes_visualizar.php" class="d-inline ms-1">
                                                <input type="hidden" name="client_id" value="<?= $client['id'] ?>">
                                                <input type="hidden" name="toggle_status" value="1">
                                                <button type="submit" class="btn <?= $isActive ? 'btn-active' : 'btn-inactive' ?> btn-sm" title="<?= $isActive ? 'Desativar' : 'Ativar' ?>">
                                                    <i class="fas <?= $isActive ? 'fa-toggle-on' : 'fa-toggle-off' ?>"></i>
                                                </button>
                                            </form>
                                            
                                            <!-- Excluir -->
                                            <button type="button" class="btn btn-delete btn-sm ms-1" 
                                                    data-bs-toggle="modal" 
                                                    data-bs-target="#deleteModal" 
                                                    data-client-id="<?= $client['id'] ?>"
                                                    data-client-name="<?= htmlspecialchars($client['nome_cliente']) ?>"
                                                    title="Excluir">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <?php endforeach; ?>
                    </div>
                    
                    <!-- Paginação -->
                    <?php if ($totalPages > 1): ?>
                    <nav aria-label="Navegação de páginas" class="mt-4">
                        <ul class="pagination justify-content-center">
                            <li class="page-item <?= $page <= 1 ? 'disabled' : '' ?>">
                                <a class="page-link" href="clientes_visualizar.php?page=<?= $page - 1 ?><?= !empty($search) ? '&search=' . urlencode($search) : '' ?><?= !empty($sortColumn) ? '&sort=' . $sortColumn . '&direction=' . $sortDirection : '' ?>" aria-label="Anterior">
                                    <span aria-hidden="true">&laquo;</span>
                                </a>
                            </li>
                            <?php for ($i = 1; $i <= $totalPages; $i++): ?>
                            <li class="page-item <?= $i === $page ? 'active' : '' ?>">
                                <a class="page-link" href="clientes_visualizar.php?page=<?= $i ?><?= !empty($search) ? '&search=' . urlencode($search) : '' ?><?= !empty($sortColumn) ? '&sort=' . $sortColumn . '&direction=' . $sortDirection : '' ?>">
                                    <?= $i ?>
                                </a>
                            </li>
                            <?php endfor; ?>
                            <li class="page-item <?= $page >= $totalPages ? 'disabled' : '' ?>">
                                <a class="page-link" href="clientes_visualizar.php?page=<?= $page + 1 ?><?= !empty($search) ? '&search=' . urlencode($search) : '' ?><?= !empty($sortColumn) ? '&sort=' . $sortColumn . '&direction=' . $sortDirection : '' ?>" aria-label="Próximo">
                                    <span aria-hidden="true">&raquo;</span>
                                </a>
                            </li>
                        </ul>
                    </nav>
                    <?php endif; ?>
                    <?php else: ?>
                    <div class="text-center py-4">
                        <i class="fas fa-users fa-3x mb-3 text-secondary"></i>
                        <p class="lead">Nenhum cliente encontrado.</p>
                        <a href="clientes.php" class="btn btn-primary mt-2">
                            <i class="fas fa-plus-circle me-2"></i> Cadastrar Novo Cliente
                        </a>
                    </div>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Modal de Visualização -->
<div class="modal fade" id="viewModal" tabindex="-1" aria-labelledby="viewModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header bg-light">
                <h5 class="modal-title" id="viewModalLabel">Visualizar Cliente</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
            </div>
            <div class="modal-body">
                <div class="row mb-4">
                    <div class="col-md-4 text-center">
                        <div id="view-logo-container" class="mb-3">
                            <!-- Logomarca será inserida aqui via JavaScript -->
                        </div>
                        <span class="badge" id="view-status-badge"></span>
                    </div>
                    <div class="col-md-8">
                        <h4 id="view-name" class="mb-3"></h4>
                        <div class="row">
                            <div class="col-md-6">
                                <p><i class="fab fa-instagram text-danger me-2"></i> <strong>Instagram:</strong> <a href="#" id="view-instagram-link" target="_blank"><span id="view-instagram"></span></a></p>
                                <p><i class="fas fa-users text-primary me-2"></i> <strong>ID do Grupo:</strong> <span id="view-grupo"></span></p>
                                <p><i class="fas fa-id-card text-info me-2"></i> <strong>ID do Instagram:</strong> <span id="view-instagram-id"></span></p>
                            </div>
                            <div class="col-md-6">
                                <p><i class="fas fa-ad text-success me-2"></i> <strong>Conta de Anúncio:</strong> <span id="view-anuncio"></span></p>
                                <p><i class="fas fa-link text-secondary me-2"></i> <strong>Link Business:</strong> <a href="#" id="view-business-link" target="_blank">Abrir Link</a></p>
                                <p><i class="fas fa-calendar-alt text-warning me-2"></i> <strong>Data de Cadastro:</strong> <span id="view-data-criacao"></span></p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-md-12">
                        <h5 class="border-bottom pb-2">Estatísticas</h5>
                        <div class="row text-center">
                            <div class="col-md-4">
                                <div class="card bg-light mb-3">
                                    <div class="card-body">
                                        <h3 id="view-post-count" class="mb-0">0</h3>
                                        <p class="text-muted">Postagens Totais</p>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="card bg-light mb-3">
                                    <div class="card-body">
                                        <h3 id="view-feed-count" class="mb-0">0</h3>
                                        <p class="text-muted">Feeds</p>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="card bg-light mb-3">
                                    <div class="card-body">
                                        <h3 id="view-story-count" class="mb-0">0</h3>
                                        <p class="text-muted">Stories</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <a href="#" id="view-edit-link" class="btn btn-primary" onclick="event.preventDefault(); window.location.href = this.getAttribute('href');">
                    <i class="fas fa-edit me-2"></i> Editar
                </a>
                <a href="#" id="view-schedule-link" class="btn btn-success" onclick="event.preventDefault(); window.location.href = this.getAttribute('href');">
                    <i class="fas fa-calendar-plus me-2"></i> Agendar Postagem
                </a>
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
            </div>
        </div>
    </div>
</div>

<!-- Modal de Exclusão -->
<div class="modal fade" id="deleteModal" tabindex="-1" aria-labelledby="deleteModalLabel" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header bg-danger text-white">
                <h5 class="modal-title" id="deleteModalLabel">Confirmar Exclusão</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <p>Tem certeza que deseja excluir este cliente?</p>
            </div>
            <div class="modal-footer">
                <form action="clientes_visualizar.php" method="POST">
                    <input type="hidden" name="action" value="delete">
                    <input type="hidden" name="client_id" id="clientId">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                    <button type="submit" class="btn btn-danger">Excluir</button>
                </form>
            </div>
        </div>
    </div>
</div>

<!-- Modal para histórico de postagens do cliente -->
<div class="modal fade" id="historyModal" tabindex="-1" aria-labelledby="historyModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header bg-light">
                <h5 class="modal-title" id="historyModalLabel">Histórico de Postagens</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <div class="client-history-header mb-3">
                    <h4 id="historyClientName" class="mb-2"></h4>
                    <p class="text-muted">@<span id="historyClientInstagram"></span></p>
                </div>
                
                <div id="historyContent" class="table-responsive">
                    <table class="table table-hover table-striped">
                        <thead>
                            <tr>
                                <th>Data da Postagem</th>
                                <th>Tipo</th>
                                <th>Formato</th>
                                <th>Status</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody id="historyTableBody">
                            <!-- Conteúdo será preenchido via JavaScript -->
                        </tbody>
                    </table>
                </div>
                <div id="noHistoryMessage" class="alert alert-info d-none">
                    <i class="fas fa-info-circle me-2"></i> Nenhuma postagem registrada para este cliente.
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
                <a href="#" id="history-schedule-link" class="btn btn-primary">Agendar Nova Postagem</a>
            </div>
        </div>
    </div>
</div>

<script>
// Inicializar modais e tooltips
document.addEventListener('DOMContentLoaded', function() {
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Configurar modal de visualização
    var viewModal = document.getElementById('viewModal');
    if (viewModal) {
        viewModal.addEventListener('show.bs.modal', function (event) {
            var button = event.relatedTarget;
            var clientId = button.getAttribute('data-client-id');
            var clientName = button.getAttribute('data-client-name');
            var clientInstagram = button.getAttribute('data-client-instagram');
            var clientGrupo = button.getAttribute('data-client-id-grupo');
            var clientInstagramId = button.getAttribute('data-client-id-instagram');
            var clientAnuncio = button.getAttribute('data-client-conta-anuncio');
            var clientLinkBusiness = button.getAttribute('data-client-link-business');
            var clientDataCriacao = button.getAttribute('data-client-data-criacao');
            var clientLogomarca = button.getAttribute('data-client-logomarca');
            var clientAtivo = button.getAttribute('data-client-ativo');
            var clientPostCount = button.getAttribute('data-client-post-count') || '0';
            
            var modal = this;
            modal.querySelector('.modal-title').textContent = 'Visualizar Cliente: ' + clientName;
            modal.querySelector('#view-name').textContent = clientName;
            
            // Garantir que todos os dados sejam exibidos corretamente
            if (modal.querySelector('#view-instagram')) {
                modal.querySelector('#view-instagram').textContent = '@' + (clientInstagram || 'N/A');
            }
            
            if (modal.querySelector('#view-instagram-link')) {
                if (clientInstagram) {
                    modal.querySelector('#view-instagram-link').href = 'https://instagram.com/' + clientInstagram;
                    modal.querySelector('#view-instagram-link').style.display = '';
                } else {
                    modal.querySelector('#view-instagram-link').style.display = 'none';
                }
            }
            
            if (modal.querySelector('#view-grupo')) {
                modal.querySelector('#view-grupo').textContent = clientGrupo || 'N/A';
            }
            
            if (modal.querySelector('#view-instagram-id')) {
                modal.querySelector('#view-instagram-id').textContent = clientInstagramId || 'N/A';
            }
            
            if (modal.querySelector('#view-anuncio')) {
                modal.querySelector('#view-anuncio').textContent = clientAnuncio || 'N/A';
            }
            
            if (modal.querySelector('#view-business-link')) {
                if (clientLinkBusiness && clientLinkBusiness !== 'null' && clientLinkBusiness !== '') {
                    modal.querySelector('#view-business-link').href = clientLinkBusiness;
                    modal.querySelector('#view-business-link').style.display = '';
                } else {
                    modal.querySelector('#view-business-link').textContent = 'N/A';
                    modal.querySelector('#view-business-link').removeAttribute('href');
                    modal.querySelector('#view-business-link').style.cursor = 'default';
                    modal.querySelector('#view-business-link').style.textDecoration = 'none';
                    modal.querySelector('#view-business-link').style.color = 'inherit';
                }
            }
            
            if (modal.querySelector('#view-data-criacao')) {
                modal.querySelector('#view-data-criacao').textContent = formatDate(clientDataCriacao);
            }
            
            if (modal.querySelector('#view-post-count')) {
                modal.querySelector('#view-post-count').textContent = clientPostCount || '0';
            }
            
            // Buscar estatísticas reais de postagens por tipo
            fetch('get_client_stats.php?client_id=' + clientId)
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        modal.querySelector('#view-post-count').textContent = data.total || '0';
                        modal.querySelector('#view-feed-count').textContent = data.feed || '0';
                        modal.querySelector('#view-story-count').textContent = data.story || '0';
                    } else {
                        // Fallback para cálculo estimado se a API falhar
                        var feedCount = Math.floor(clientPostCount * 0.7); // 70% como feeds
                        var storyCount = clientPostCount - feedCount; // 30% como stories
                        modal.querySelector('#view-feed-count').textContent = feedCount;
                        modal.querySelector('#view-story-count').textContent = storyCount;
                    }
                })
                .catch(error => {
                    console.error('Erro ao buscar estatísticas:', error);
                    // Fallback para cálculo estimado em caso de erro
                    var feedCount = Math.floor(clientPostCount * 0.7); // 70% como feeds
                    var storyCount = clientPostCount - feedCount; // 30% como stories
                    modal.querySelector('#view-feed-count').textContent = feedCount;
                    modal.querySelector('#view-story-count').textContent = storyCount;
                });
            
            // Configurar status do cliente
            var statusBadge = modal.querySelector('#view-status-badge');
            if (clientAtivo === '1') {
                statusBadge.textContent = 'Ativo';
                statusBadge.className = 'badge bg-success';
            } else {
                statusBadge.textContent = 'Inativo';
                statusBadge.className = 'badge bg-danger';
            }
            
            // Configurar logomarca
            var logoContainer = modal.querySelector('#view-logo-container');
            logoContainer.innerHTML = '';
            
            // Verificar se existe a pasta uploads/logomarcas
            var checkDir = function() {
                var xhr = new XMLHttpRequest();
                xhr.open('HEAD', 'uploads/logomarcas/', true);
                xhr.onreadystatechange = function() {
                    if (xhr.readyState === 4) {
                        if (xhr.status === 200) {
                            // Diretório existe
                            carregarLogomarca();
                        } else {
                            // Diretório não existe, criar placeholder
                            criarPlaceholder();
                        }
                    }
                };
                xhr.send(null);
            };
            
            var carregarLogomarca = function() {
                if (clientLogomarca && clientLogomarca !== 'null' && clientLogomarca !== '') {
                    var logoImg = document.createElement('img');
                    logoImg.src = 'uploads/logomarcas/' + clientLogomarca;
                    logoImg.alt = 'Logomarca ' + clientName;
                    logoImg.className = 'img-fluid rounded';
                    logoImg.style.maxHeight = '150px';
                    logoImg.style.maxWidth = '100%';
                    logoImg.style.display = 'block';
                    logoImg.style.margin = '0 auto';
                    logoImg.style.objectFit = 'contain';
                    logoImg.style.backgroundColor = '#f8f9fa';
                    logoImg.style.padding = '10px';
                    logoImg.onerror = function() {
                        // Se a imagem não carregar, mostrar placeholder
                        this.style.display = 'none';
                        criarPlaceholder();
                    };
                    logoContainer.appendChild(logoImg);
                } else {
                    criarPlaceholder();
                }
            };
            
            var criarPlaceholder = function() {
                var placeholderDiv = document.createElement('div');
                placeholderDiv.className = 'client-placeholder-logo d-flex align-items-center justify-content-center bg-light rounded';
                placeholderDiv.style.height = '150px';
                placeholderDiv.style.width = '100%';
                
                var placeholderIcon = document.createElement('i');
                placeholderIcon.className = 'fas fa-building fa-4x text-secondary';
                
                placeholderDiv.appendChild(placeholderIcon);
                logoContainer.appendChild(placeholderDiv);
            };
            
            // Iniciar verificação
            checkDir();
            
            // Configurar links com verificação de existência dos elementos
            var editLink = modal.querySelector('#view-edit-link');
            if (editLink) {
                editLink.href = 'clientes.php?id=' + clientId;
            }
            
            var scheduleLink = modal.querySelector('#view-schedule-link');
            if (scheduleLink) {
                scheduleLink.href = 'index.php?cliente_id=' + clientId;
            }
            
            var historyLink = modal.querySelector('#view-history-link');
            if (historyLink) {
                historyLink.href = '#';
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                };
                
                try {
                    const date = new Date(dateString);
                    return date.toLocaleDateString('pt-BR', options);
                } catch (e) {
                    return dateString;
                }
            }
        });
    }
    
    // Configurar modal de exclusão
    var deleteModal = document.getElementById('deleteModal');
    if (deleteModal) {
        deleteModal.addEventListener('show.bs.modal', function (event) {
            var button = event.relatedTarget;
            var clientId = button.getAttribute('data-client-id');
            var clientName = button.getAttribute('data-client-name');
            
            var modal = this;
            modal.querySelector('.modal-body p').textContent = 'Tem certeza que deseja excluir o cliente "' + clientName + '"? Esta ação não pode ser desfeita.';
            modal.querySelector('#clientId').value = clientId;
        });
    }
    
    // Configurar modal de histórico
    var historyModal = document.getElementById('historyModal');
    if (historyModal) {
        historyModal.addEventListener('show.bs.modal', function (event) {
            var button = event.relatedTarget;
            var clientId = button.getAttribute('data-client-id');
            var clientName = button.getAttribute('data-client-name');
            var clientInstagram = button.getAttribute('data-client-instagram');
            
            document.getElementById('historyClientName').textContent = clientName;
            document.getElementById('historyClientInstagram').textContent = clientInstagram;
            document.getElementById('history-schedule-link').href = 'index.php?cliente_id=' + clientId;
            
            // Mostrar indicador de carregamento
            var historyTableBody = document.getElementById('historyTableBody');
            historyTableBody.innerHTML = '<tr><td colspan="5" class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Carregando...</span></div></td></tr>';
            
            // Fazer requisição AJAX para buscar o histórico
            fetch('ajax/get_client_history.php?client_id=' + clientId)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Erro ao carregar histórico');
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.success && data.posts && data.posts.length > 0) {
                        // Preencher a tabela com os dados
                        historyTableBody.innerHTML = '';
                        data.posts.forEach(post => {
                            var row = document.createElement('tr');
                            row.innerHTML = `
                                <td>${formatDate(post.data_postagem)}</td>
                                <td>${post.tipo_postagem || '-'}</td>
                                <td>${post.formato || '-'}</td>
                                <td><span class="badge ${getBadgeClass(post.status)}">${post.status || 'Pendente'}</span></td>
                                <td>
                                    <a href="visualizar_postagem.php?id=${post.id}" class="btn btn-sm btn-primary">
                                        <i class="fas fa-eye"></i>
                                    </a>
                                </td>
                            `;
                            historyTableBody.appendChild(row);
                        });
                        
                        document.getElementById('historyContent').classList.remove('d-none');
                        document.getElementById('noHistoryMessage').classList.add('d-none');
                    } else {
                        // Mostrar mensagem de nenhum histórico
                        document.getElementById('historyContent').classList.add('d-none');
                        document.getElementById('noHistoryMessage').classList.remove('d-none');
                    }
                })
                .catch(error => {
                    console.error('Erro:', error);
                    historyTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Erro ao carregar histórico. Tente novamente mais tarde.</td></tr>';
                });
        });
    }
    
    // Função para formatar data
    function formatDate(dateString) {
        if (!dateString) return '-';
        
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        
        return date.toLocaleDateString('pt-BR') + ' ' + 
               date.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
    }
    
    // Função para determinar a classe do badge baseado no status
    function getBadgeClass(status) {
        if (!status) return 'bg-secondary';
        
        status = status.toLowerCase();
        if (status.includes('agendado') || status === 'pendente') return 'bg-warning';
        if (status.includes('publicado') || status === 'concluído') return 'bg-success';
        if (status.includes('cancelado') || status === 'erro') return 'bg-danger';
        return 'bg-secondary';
    }
    
    // Configurar filtro de busca em tempo real
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            filterClients(searchTerm);
        });
    }
    
    // Função para filtrar clientes em tempo real
    function filterClients(searchTerm) {
        const cards = document.querySelectorAll('#clientsCards .client-card-col');
        
        cards.forEach(card => {
            const name = card.getAttribute('data-name');
            const instagram = card.getAttribute('data-instagram');
            
            if (name.includes(searchTerm) || instagram.includes(searchTerm)) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
        });
    }    
        // Atualizar contador de resultados
        const visibleCards = document.querySelectorAll('#clientsCards .client-card-col:not([style*="display: none"])').length;
        const totalCards = cards.length;
        
        const resultsCounter = document.getElementById('resultsCounter');
        if (resultsCounter) {
            resultsCounter.textContent = `Mostrando ${visibleCards} de ${totalCards} clientes`;
        }
    }
    
    // Atualizar a sessão a cada 5 minutos para mantê-la ativa
    setInterval(function() {
        fetch('ajax/update_session.php')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log('Sessão atualizada:', data.timestamp);
                }
            })
            .catch(error => console.error('Erro ao atualizar sessão:', error));
    }, 300000); // 5 minutos
});
</script>

<?php require_once 'includes/footer.php'; ?>
