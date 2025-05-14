<?php
ob_start();

require_once 'config/config.php';
require_once 'config/db.php';
require_once 'includes/auth.php';
require_once 'includes/header.php';

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

// Exige permissão de acesso
requirePermission('Editor');

// Conexão com banco
$database = new Database();
$conn = $database->connect();

// Processar envio do formulário
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $requiredFields = ['nome', 'id_grupo', 'instagram', 'id_instagram', 'conta_anuncio', 'link_business'];
    $missingFields = [];

    foreach ($requiredFields as $field) {
        if (!isset($_POST[$field]) || empty(trim($_POST[$field]))) {
            $missingFields[] = $field;
        }
    }
    
    // Processar upload de logomarca
    $logomarcaFileName = null;
    if (isset($_FILES['logomarca']) && $_FILES['logomarca']['error'] == 0) {
        $allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        $maxFileSize = 5 * 1024 * 1024; // 5MB
        
        if (!in_array($_FILES['logomarca']['type'], $allowedTypes)) {
            setFlashMessage('danger', 'Tipo de arquivo não permitido. Use apenas JPG, PNG ou GIF.');
        } elseif ($_FILES['logomarca']['size'] > $maxFileSize) {
            setFlashMessage('danger', 'O arquivo é muito grande. Tamanho máximo: 5MB.');
        } else {
            // Gerar nome único para o arquivo
            $fileExtension = pathinfo($_FILES['logomarca']['name'], PATHINFO_EXTENSION);
            $logomarcaFileName = 'logo_' . time() . '_' . uniqid() . '.' . $fileExtension;
            $uploadPath = 'uploads/logomarcas/' . $logomarcaFileName;
            
            // Criar diretório se não existir
            if (!file_exists('uploads/logomarcas/')) {
                mkdir('uploads/logomarcas/', 0777, true);
            }
            
            if (move_uploaded_file($_FILES['logomarca']['tmp_name'], $uploadPath)) {
                // Upload bem-sucedido
            } else {
                setFlashMessage('danger', 'Erro ao fazer upload da logomarca.');
                $logomarcaFileName = null;
            }
        }
    }

    if (!empty($missingFields)) {
        setFlashMessage('danger', 'Por favor, preencha todos os campos obrigatórios.');
    } else {
        try {
            $query = "SELECT COUNT(*) as count FROM clientes WHERE instagram = :instagram";
            if (isset($_POST['client_id'])) {
                $query .= " AND id != :id";
            }

            $stmt = $conn->prepare($query);
            $stmt->bindParam(':instagram', $_POST['instagram']);

            if (isset($_POST['client_id'])) {
                $stmt->bindParam(':id', $_POST['client_id']);
            }

            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($result['count'] > 0) {
                setFlashMessage('danger', 'Já existe um cliente com este nome de Instagram.');
            } else {
                if (isset($_POST['client_id'])) {
                    if ($logomarcaFileName) {
                        // Se tiver nova logomarca, atualiza
                        $query = "UPDATE clientes 
                                  SET nome_cliente = :nome, id_grupo = :id_grupo, instagram = :instagram, 
                                      id_instagram = :id_instagram, conta_anuncio = :conta_anuncio, 
                                      link_business = :link_business, logomarca = :logomarca, ativo = :ativo
                                  WHERE id = :id";
                    } else {
                        // Se não tiver nova logomarca, mantém a atual
                        $query = "UPDATE clientes 
                                  SET nome_cliente = :nome, id_grupo = :id_grupo, instagram = :instagram, 
                                      id_instagram = :id_instagram, conta_anuncio = :conta_anuncio, 
                                      link_business = :link_business, ativo = :ativo
                                  WHERE id = :id";
                    }
                    $stmt = $conn->prepare($query);
                    $stmt->bindParam(':id', $_POST['client_id']);
                    $ativo = isset($_POST['ativo']) ? 1 : 0;
                    $stmt->bindParam(':ativo', $ativo, PDO::PARAM_INT);
                    
                    if ($logomarcaFileName) {
                        $stmt->bindParam(':logomarca', $logomarcaFileName);
                        
                        // Remover logomarca antiga se existir
                        $queryOldLogo = "SELECT logomarca FROM clientes WHERE id = :id";
                        $stmtOldLogo = $conn->prepare($queryOldLogo);
                        $stmtOldLogo->bindParam(':id', $_POST['client_id']);
                        $stmtOldLogo->execute();
                        $oldLogo = $stmtOldLogo->fetch(PDO::FETCH_ASSOC);
                        
                        if ($oldLogo && !empty($oldLogo['logomarca']) && file_exists('uploads/logomarcas/' . $oldLogo['logomarca'])) {
                            unlink('uploads/logomarcas/' . $oldLogo['logomarca']);
                        }
                    }
                } else {
                    if ($logomarcaFileName) {
                        $query = "INSERT INTO clientes (nome_cliente, id_grupo, instagram, id_instagram, conta_anuncio, link_business, logomarca, data_criacao, ativo) 
                                  VALUES (:nome, :id_grupo, :instagram, :id_instagram, :conta_anuncio, :link_business, :logomarca, NOW(), :ativo)";
                    } else {
                        $query = "INSERT INTO clientes (nome_cliente, id_grupo, instagram, id_instagram, conta_anuncio, link_business, data_criacao, ativo) 
                                  VALUES (:nome, :id_grupo, :instagram, :id_instagram, :conta_anuncio, :link_business, NOW(), :ativo)";
                    }
                    $stmt = $conn->prepare($query);
                    $ativo = isset($_POST['ativo']) ? 1 : 0;
                    $stmt->bindParam(':ativo', $ativo, PDO::PARAM_INT);
                    
                    if ($logomarcaFileName) {
                        $stmt->bindParam(':logomarca', $logomarcaFileName);
                    }
                }

                $stmt->bindParam(':nome', $_POST['nome']);
                $stmt->bindParam(':id_grupo', $_POST['id_grupo']);
                $stmt->bindParam(':instagram', $_POST['instagram']);
                $stmt->bindParam(':id_instagram', $_POST['id_instagram']);
                $stmt->bindParam(':conta_anuncio', $_POST['conta_anuncio']);
                $stmt->bindParam(':link_business', $_POST['link_business']);
                $stmt->execute();

                if (isset($_POST['client_id'])) {
                    setFlashMessage('success', 'Cliente atualizado com sucesso!');
                } else {
                    setFlashMessage('success', 'Cliente cadastrado com sucesso!');
                }
                redirect('clientes_visualizar.php');
            }
        } catch (PDOException $e) {
            error_log("Database Error: " . $e->getMessage());
            setFlashMessage('danger', 'Erro ao processar solicitação: ' . $e->getMessage());
        }
    }
}

// Verificar se estamos editando
$clientData = null;
if (isset($_GET['id']) && is_numeric($_GET['id'])) {
    $query = "SELECT * FROM clientes WHERE id = :id";
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':id', $_GET['id']);
    $stmt->execute();

    if ($stmt->rowCount() > 0) {
        $clientData = $stmt->fetch(PDO::FETCH_ASSOC);
    } else {
        setFlashMessage('danger', 'Cliente não encontrado.');
        redirect('clientes_visualizar.php');
    }
}

$pageTitle = $clientData ? 'Editar Cliente' : 'Cadastro de Cliente';
?>

<div class="container">
    <div class="row mb-4">
        <div class="col-md-12">
            <h1 class="mb-3"><?= htmlspecialchars($pageTitle) ?></h1>
            <p class="text-secondary">
                <?= $clientData ? 'Atualize os dados do cliente.' : 'Preencha o formulário abaixo para cadastrar um novo cliente.' ?>
            </p>
        </div>
    </div>

    <div class="row">
        <div class="col-md-12">
            <div class="card">
                <div class="card-header">
                    <strong><?= $clientData ? 'Formulário de Edição' : 'Formulário de Cadastro' ?></strong>
                </div>
                <div class="card-body">
                    <form action="clientes.php" method="POST" enctype="multipart/form-data">
                        <?php if ($clientData): ?>
                        <input type="hidden" name="client_id" value="<?= htmlspecialchars($clientData['id']) ?>">
                        <?php endif; ?>

                        <div class="row mb-3">
                            <div class="col-md-6">
                                <label for="nome" class="form-label">Nome do Cliente *</label>
                                <input type="text" class="form-control" id="nome" name="nome" value="<?= $clientData ? htmlspecialchars($clientData['nome_cliente']) : '' ?>" required>
                                <div class="form-text">Nome completo ou razão social do cliente.</div>
                            </div>

                            <div class="col-md-6">
                                <label for="id_grupo" class="form-label">ID do Grupo *</label>
                                <input type="text" class="form-control" id="id_grupo" name="id_grupo" value="<?= $clientData ? htmlspecialchars($clientData['id_grupo']) : '' ?>" required>
                                <div class="form-text">Identificador do grupo do cliente.</div>
                            </div>
                        </div>

                        <div class="row mb-3">
                            <div class="col-md-6">
                                <label for="instagram" class="form-label">Instagram *</label>
                                <div class="input-group">
                                    <span class="input-group-text">@</span>
                                    <input type="text" class="form-control" id="instagram" name="instagram" value="<?= $clientData ? htmlspecialchars($clientData['instagram']) : '' ?>" required>
                                </div>
                                <div class="form-text">Nome de usuário do Instagram sem o '@'.</div>
                            </div>

                            <div class="col-md-6">
                                <label for="id_instagram" class="form-label">ID do Instagram *</label>
                                <input type="text" class="form-control" id="id_instagram" name="id_instagram" value="<?= $clientData ? htmlspecialchars($clientData['id_instagram']) : '' ?>" required>
                                <div class="form-text">ID numérico da conta do Instagram.</div>
                            </div>
                        </div>

                        <div class="row mb-3">
                            <div class="col-md-6">
                                <label for="conta_anuncio" class="form-label">Conta de Anúncio *</label>
                                <input type="text" class="form-control" id="conta_anuncio" name="conta_anuncio" value="<?= $clientData ? htmlspecialchars($clientData['conta_anuncio']) : '' ?>" required>
                                <div class="form-text">Identificador da conta de anúncios.</div>
                            </div>

                            <div class="col-md-6">
                                <label for="link_business" class="form-label">Link do Business *</label>
                                <input type="url" class="form-control" id="link_business" name="link_business" value="<?= $clientData ? htmlspecialchars($clientData['link_business']) : '' ?>" required>
                                <div class="form-text">URL completa do perfil business do Instagram.</div>
                            </div>
                        </div>
                        
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <label for="logomarca" class="form-label">Logomarca</label>
                                <input type="file" class="form-control" id="logomarca" name="logomarca" accept="image/jpeg,image/png,image/gif">
                                <div class="form-text">Envie a logomarca do cliente (JPG, PNG ou GIF, máx. 5MB).</div>
                                
                                <?php if ($clientData && !empty($clientData['logomarca']) && file_exists('uploads/logomarcas/' . $clientData['logomarca'])): ?>
                                <div class="mt-2">
                                    <p class="mb-1">Logomarca atual:</p>
                                    <img src="uploads/logomarcas/<?= htmlspecialchars($clientData['logomarca']) ?>" alt="Logomarca atual" class="img-thumbnail" style="max-height: 100px;">
                                </div>
                                <?php endif; ?>
                            </div>
                            
                            <div class="col-md-6">
                                <label class="form-label">Status do Cliente</label>
                                <div class="form-check form-switch mt-2">
                                    <input class="form-check-input" type="checkbox" id="ativo" name="ativo" <?= (!$clientData || ($clientData && isset($clientData['ativo']) && $clientData['ativo'])) ? 'checked' : '' ?>>
                                    <label class="form-check-label" for="ativo">Cliente Ativo</label>
                                </div>
                                <div class="form-text">Clientes inativos não aparecerão nas listas de agendamento.</div>
                            </div>
                        </div>

                        <div class="d-grid gap-2 d-md-flex justify-content-md-end">
                            <a href="clientes_visualizar.php" class="btn btn-outline-secondary me-md-2">
                                <i class="fas fa-times me-2"></i> Cancelar
                            </a>
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-save me-2"></i> <?= $clientData ? 'Atualizar' : 'Cadastrar' ?>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
</div>

<?php require_once 'includes/footer.php'; ?>
