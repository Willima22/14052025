<?php
// Iniciar output buffering para evitar problemas de headers already sent
ob_start();

require_once 'config/config.php';
require_once 'config/db.php';

// Verificar se o usuário está logado antes de incluir o header
if (!isset($_SESSION['user_id'])) {
    redirect('login.php');
    exit;
}

// Agora incluir o header
require_once 'includes/header.php';

// Redirect if no post data in session
if (!isset($_SESSION['post_data'])) {
    setFlashMessage('danger', 'Dados do agendamento não encontrados. Por favor, preencha o formulário novamente.');
    redirect('index.php');
}

$postData = $_SESSION['post_data'];

// Get database connection
$database = new Database();
$conn = $database->connect();

// Get client details
$query = "SELECT * FROM clientes WHERE id = :id";
$stmt = $conn->prepare($query);
$stmt->bindParam(':id', $postData['cliente_id']);
$stmt->execute();
$client = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$client) {
    setFlashMessage('danger', 'Cliente não encontrado. Por favor, tente novamente.');
    redirect('index.php');
}

// Process the form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Convert date and time to UTC ISO 8601
    $dateTime = convertToUTC($postData['data_postagem'], $postData['hora_postagem']);
    
    try {
        // Begin transaction
        $conn->beginTransaction();
        
        // Get current user ID from session
        $usuario_id = $_SESSION['user_id'] ?? null;
        
        // Current date and time for data_criacao
        $data_criacao = date('Y-m-d H:i:s');
        
        // Get client name for the post_id_unique
        $stmt_client = $conn->prepare("SELECT nome_cliente FROM clientes WHERE id = ?");
        $stmt_client->execute([$postData['cliente_id']]);
        $client_name = $stmt_client->fetchColumn();
        
        // Clean client name (remove spaces, special characters)
        $client_name_clean = preg_replace('/[^a-zA-Z0-9]/', '', $client_name);
        
        // Generate post_id_unique with format [nome do cliente]_[MMDDYYYYHHMMSS]
        $timestamp = date('mdYHis');
        $post_id_unique = $client_name_clean . '_' . $timestamp;
        
        // Extrair URLs dos arquivos
        $arquivos_urls = [];
        foreach ($postData['arquivos'] as $index => $arquivo) {
            // Verificar se temos uma URL completa ou apenas um nome de arquivo
            if (isset($arquivo['url']) && !empty($arquivo['url'])) {
                // Usar a URL já armazenada
                $arquivos_urls[] = $arquivo['url'];
                
                // Registrar para depuração
                error_log("Arquivo URL para webhook: " . $arquivo['url']);
            }
            // Compatibilidade com o formato antigo (apenas nome do arquivo)
            else if (is_string($arquivo)) {
                $url = rtrim(FILES_BASE_URL, '/') . '/uploads/' . $arquivo;
                $arquivos_urls[] = $url;
                
                // Registrar para depuração
                error_log("Arquivo string para webhook: " . $url);
            }
        }
        
        // Converter array de arquivos para JSON
        $arquivos_json = json_encode($postData['arquivos']);
        
        // Registrar para depuração
        error_log("Arquivos para salvar no banco: " . $arquivos_json);
        
        // Insert into postagens table
        $query = "INSERT INTO postagens (cliente_id, tipo_postagem, formato, data_postagem, data_postagem_utc, legenda, post_id_unique, webhook_status, data_criacao, usuario_id, arquivos) 
                  VALUES (:cliente_id, :tipo_postagem, :formato, :data_postagem, :data_postagem_utc, :legenda, :post_id_unique, 0, :data_criacao, :usuario_id, :arquivos)";
        
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':cliente_id', $postData['cliente_id']);
        $stmt->bindParam(':tipo_postagem', $postData['tipo_postagem']);
        $stmt->bindParam(':formato', $postData['formato']);
        
        // Create datetime object for database
        $dbDateTime = $postData['data_postagem'] . ' ' . $postData['hora_postagem'];
        $stmt->bindParam(':data_postagem', $dbDateTime);
        $stmt->bindParam(':data_postagem_utc', $dateTime);
        $stmt->bindParam(':legenda', $postData['legenda']);
        $stmt->bindParam(':data_criacao', $data_criacao);
        $stmt->bindParam(':usuario_id', $usuario_id);
        $stmt->bindParam(':post_id_unique', $post_id_unique);
        $stmt->bindParam(':arquivos', $arquivos_json);
        
        $stmt->execute();
        $postId = $conn->lastInsertId();
        
        // Registrar o agendamento no log do sistema
        $logDetalhes = json_encode([
            'post_id' => $postId,
            'cliente_id' => $postData['cliente_id'],
            'cliente_nome' => $client['nome'],
            'data_postagem' => date('d/m/Y', strtotime($postData['data_postagem'])),
            'hora_postagem' => $postData['hora_postagem']
        ]);
        registrarLog('Agendamento de Postagem', $logDetalhes);
        
        // Formatar data e hora para formato brasileiro
        $data_br = DateTime::createFromFormat('Y-m-d', $postData['data_postagem']) ?
            DateTime::createFromFormat('Y-m-d', $postData['data_postagem'])->format('d/m/Y') :
            DateTime::createFromFormat('d/m/Y', $postData['data_postagem'])->format('d/m/Y');
        $hora_br = $postData['hora_postagem'];
        
        // Prepare data for webhook
        // Garantir que as URLs dos arquivos estão corretas
        $arquivos_urls_finais = [];
        foreach ($postData['arquivos'] as $arquivo) {
            if (isset($arquivo['url']) && !empty($arquivo['url'])) {
                $arquivos_urls_finais[] = $arquivo['url'];
                error_log("URL para webhook: " . $arquivo['url']);
            }
        }
        
        $webhookData = [
            'post_id' => $postId,
            'client' => [
                'id' => $client['id'],
                'name' => $client['nome_cliente'] ?? $client['nome'] ?? 'Cliente ' . $client['id'],
                'instagram' => $client['instagram'] ?? '',
                'instagram_id' => $client['id_instagram'] ?? '',
                'business_link' => $client['link_business'] ?? '',
                'ad_account' => $client['conta_anuncio'] ?? ''
            ],
            'post_type' => $postData['tipo_postagem'],
            'format' => $postData['formato'],
            'scheduled_date' => $dateTime,
            'scheduled_date_brazil' => $data_br,
            'scheduled_time_brazil' => $hora_br,
            'caption' => $postData['legenda'] ?? '',
            'files' => empty($arquivos_urls_finais) ? [] : $arquivos_urls_finais,
            'cliente_id' => $postData['cliente_id'],
            'data_postagem' => $postData['data_postagem'],
            'hora_postagem' => $postData['hora_postagem']
        ];
        
        // Log dos dados enviados para o webhook
        error_log("Dados enviados para webhook: " . json_encode($webhookData));
        
        // Send webhook request
        $webhookResponse = '';
        try {
            // Preparar URLs dos arquivos no formato correto: www.[dominio]/arquivos/[nomedocliente]/[tipo]/nome_do_arquivo.png
            $arquivos_urls = [];
            $dominio = preg_replace('/^www\./', '', $_SERVER['HTTP_HOST']);
            $cliente_slug = preg_replace('/[^a-z0-9]/', '', strtolower($client['nome_cliente']));
            
            // Determinar o tipo de mídia com base no formato da postagem
            $tipo_midia = 'imagem';
            if (strpos(strtolower($postData['formato']), 'vídeo') !== false) {
                $tipo_midia = 'video';
            }
            
            foreach ($postData['arquivos'] as $arquivo) {
                if (is_array($arquivo)) {
                    // Novo formato (array)
                    if (isset($arquivo['url']) && !empty($arquivo['url'])) {
                        // Se a URL já estiver no formato correto, use-a
                        if (strpos($arquivo['url'], '/arquivos/' . $cliente_slug . '/') !== false) {
                            $arquivos_urls[] = $arquivo['url'];
                        } else {
                            // Extrair o nome do arquivo da URL existente
                            $nome_arquivo = basename($arquivo['url']);
                            // Construir a nova URL no formato correto
                            $arquivos_urls[] = 'https://www.' . $dominio . '/arquivos/' . $cliente_slug . '/' . $tipo_midia . '/' . $nome_arquivo;
                        }
                    } else if (isset($arquivo['path']) && !empty($arquivo['path'])) {
                        // Extrair o nome do arquivo do caminho
                        $nome_arquivo = basename($arquivo['path']);
                        // Construir a URL no formato correto
                        $arquivos_urls[] = 'https://www.' . $dominio . '/arquivos/' . $cliente_slug . '/' . $tipo_midia . '/' . $nome_arquivo;
                    }
                } else if (is_string($arquivo)) {
                    // Formato antigo (string)
                    // Construir a URL no formato correto
                    $arquivos_urls[] = 'https://www.' . $dominio . '/arquivos/' . $cliente_slug . '/' . $tipo_midia . '/' . $arquivo;
                }
            }
            
            // Atualizar dados do webhook
            $webhookData['files'] = $arquivos_urls;
            
            // Selecionar a URL do webhook com base no formato da postagem
            $webhookUrl = WEBHOOK_URL; // URL padrão
            
            // Se for carrossel, usar a URL específica para carrossel
            if ($postData['formato'] === 'Carrossel') {
                $webhookUrl = WEBHOOK_URL_CAROUSEL;
                error_log("Usando webhook para carrossel: " . $webhookUrl);
            }
            
            // Inicializar cURL com a URL selecionada
            $ch = curl_init($webhookUrl);
            
            // Configurar cURL
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($webhookData));
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
                'Accept: application/json'
            ]);
            curl_setopt($ch, CURLOPT_TIMEOUT, 30);
            
            // Executar requisição
            $webhookResponse = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            
            // Registrar resposta
            error_log("Resposta webhook ($httpCode): " . $webhookResponse);
            
            curl_close($ch);
        } catch (Exception $e) {
            error_log("Webhook Error: " . $e->getMessage());
            $webhookResponse = 'Error: ' . $e->getMessage();
        }
        
        // Update post with webhook response and set webhook_enviado flag
        $webhookEnviado = ($httpCode >= 200 && $httpCode < 300) ? 1 : 0;
        $query = "UPDATE postagens SET webhook_response = :response, webhook_enviado = :enviado WHERE id = :id";
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':response', $webhookResponse);
        $stmt->bindParam(':enviado', $webhookEnviado, PDO::PARAM_INT);
        $stmt->bindParam(':id', $postId);
        $stmt->execute();
        
        // Commit transaction
        $conn->commit();
        
        // Clear session post data
        unset($_SESSION['post_data']);
        
        // Set success message and redirect
        setFlashMessage('success', 'Postagem agendada com sucesso!');
        
        // Garantir que todos os buffers de saída sejam limpos
        while (ob_get_level()) {
            ob_end_clean();
        }
        
        // Registrar o redirecionamento em log para depuração
        error_log("Redirecionando para index.php após agendamento bem-sucedido");
        
        // Redirecionamento com múltiplas abordagens para garantir que funcione
        if (!headers_sent()) {
            header("Location: index.php");
        } else {
            error_log("Headers já enviados, usando métodos alternativos de redirecionamento");
        }
        
        // Redirecionamento via JavaScript como fallback
        echo '<script type="text/javascript">console.log("Redirecionando via JavaScript"); window.location.href="index.php";</script>';
        
        // Redirecionamento via meta refresh como último recurso
        echo '<meta http-equiv="refresh" content="0;url=index.php" />';
        
        // Forçar término do script
        exit();
        
    } catch (Exception $e) {
        // Rollback transaction on error
        $conn->rollBack();
        error_log("Database Error: " . $e->getMessage());
        setFlashMessage('danger', 'Erro ao agendar postagem: ' . $e->getMessage());
    }
}

// Format date for display
$formattedDate = DateTime::createFromFormat('d/m/Y', $postData['data_postagem']);
if ($formattedDate) {
    $displayDate = $formattedDate->format('d/m/Y');
} else {
    $displayDate = $postData['data_postagem'];
}
?>

<div class="container">
    <div class="row mb-4">
        <div class="col-md-12">
            <h1 class="mb-3">Confirmar Agendamento</h1>
            <p class="text-secondary">Revise os dados da postagem antes de confirmar o agendamento.</p>
        </div>
    </div>
    
    <div class="row">
        <div class="col-md-8">
            <div class="card mb-4">
                <div class="card-header">
                    <strong>Detalhes da Postagem</strong>
                </div>
                <div class="card-body">
                    <div class="row mb-3">
                        <div class="col-md-4 fw-bold">Cliente:</div>
                        <div class="col-md-8"><?= htmlspecialchars($client['nome_cliente'] ?? $client['nome'] ?? '') ?></div>
                    </div>
                    
                    <div class="row mb-3">
                        <div class="col-md-4 fw-bold">Instagram:</div>
                        <div class="col-md-8"><?= htmlspecialchars($client['instagram'] ?? '') ?></div>
                    </div>
                    
                    <div class="row mb-3">
                        <div class="col-md-4 fw-bold">Tipo de Postagem:</div>
                        <div class="col-md-8"><?= htmlspecialchars($postData['tipo_postagem'] ?? '') ?></div>
                    </div>
                    
                    <div class="row mb-3">
                        <div class="col-md-4 fw-bold">Formato:</div>
                        <div class="col-md-8"><?= htmlspecialchars($postData['formato'] ?? '') ?></div>
                    </div>
                    
                    <div class="row mb-3">
                        <div class="col-md-4 fw-bold">Data e Hora:</div>
                        <div class="col-md-8">
                            <?= $displayDate ?> às <?= $postData['hora_postagem'] ?? '' ?> (horário de Brasília)
                        </div>
                    </div>
                    
                    <?php if (!empty($postData['legenda'])): ?>
                    <div class="row mb-3">
                        <div class="col-md-4 fw-bold">Legenda:</div>
                        <div class="col-md-8">
                            <div style="white-space: pre-line;"><?= htmlspecialchars($postData['legenda'] ?? '') ?></div>
                        </div>
                    </div>
                    <?php endif; ?>
                </div>
            </div>
        </div>
        
        <div class="col-md-4">
            <div class="card mb-4">
                <div class="card-header">
                    <strong>Mídia</strong>
                </div>
                <div class="card-body">
                    <?php if (!empty($postData['arquivos'])): ?>
                    <div class="upload-preview">
                        <?php 
                        // Remover duplicatas de arquivos (para evitar mostrar o mesmo arquivo duas vezes)
                        $uniqueFiles = [];
                        $processedUrls = [];
                        
                        foreach ($postData['arquivos'] as $file) {
                            // Verificar se $file é um array (novo formato) ou string (formato antigo)
                            if (is_array($file)) {
                                $fileUrl = $file['url'] ?? '';
                                // Pular se já processamos esta URL
                                if (in_array($fileUrl, $processedUrls)) continue;
                                $processedUrls[] = $fileUrl;
                                $uniqueFiles[] = $file;
                            } else {
                                // Formato antigo (string)
                                if (in_array($file, $processedUrls)) continue;
                                $processedUrls[] = $file;
                                $uniqueFiles[] = $file;
                            }
                        }
                        
                        // Agora exibir apenas os arquivos únicos
                        foreach ($uniqueFiles as $file): 
                        ?>
                        <div class="preview-item">
                            <?php                             // Verificar se $file é um array (novo formato) ou string (formato antigo)
                            if (is_array($file)) {
                                // Garantir que temos um caminho completo para o arquivo
                                $filePath = isset($file['path']) ? UPLOAD_DIR . $file['path'] : (isset($file['url']) ? $file['url'] : '');
                                
                                // Garantir que a URL é completa para exibição
                                if (isset($file['url']) && !empty($file['url'])) {
                                    // Verificar se a URL já é absoluta (começa com http ou https)
                                    if (strpos($file['url'], 'http') === 0) {
                                        $fileUrl = $file['url'];
                                    } else {
                                        // Adicionar o domínio base se for um caminho relativo
                                        $fileUrl = rtrim(FILES_BASE_URL, '/') . '/' . ltrim($file['url'], '/');
                                    }
                                } else if (isset($file['path']) && !empty($file['path'])) {
                                    $fileUrl = rtrim(FILES_BASE_URL, '/') . '/' . ltrim($file['path'], '/');
                                } else {
                                    $fileUrl = '';
                                }
                                
                                $tipo = $file['tipo'] ?? '';
                            } else {
                                // Formato antigo (string)
                                $filePath = UPLOAD_DIR . $file;
                                // Garantir URL completa para exibição
                                $fileUrl = rtrim(FILES_BASE_URL, '/') . '/uploads/' . $file;
                                $tipo = '';
                            }
                            
                            // Verificar se o arquivo existe antes de tentar obter o tipo MIME
                            if (file_exists($filePath)) {
                                $fileType = mime_content_type($filePath);
                            } else {
                                // Se o arquivo não existir ou for uma URL externa, tentar determinar o tipo pela extensão
                                $fileType = strpos($filePath, '.mp4') !== false || strpos($filePath, '.mov') !== false ? 'video/mp4' : 'image/jpeg';
                            }
                            
                            if (strpos($fileType, 'image/') === 0): 
                            ?>
                                <img src="<?= $fileUrl ?>" alt="Preview" class="img-fluid">
                                <?php if (!empty($tipo)): ?>
                                <div class="tipo-badge"><?= htmlspecialchars(ucfirst($tipo)) ?></div>
                                <?php endif; ?>
                            <?php else: ?>
                                <div class="video-preview d-flex flex-column align-items-center justify-content-center h-100">
                                    <i class="fas fa-video fa-2x mb-2"></i>
                                    <span class="small">Vídeo</span>
                                    <?php if (!empty($tipo)): ?>
                                    <div class="tipo-badge"><?= htmlspecialchars(ucfirst($tipo)) ?></div>
                                    <?php endif; ?>
                                </div>
                            <?php endif; ?>
                        </div>
                        <?php endforeach; ?>
                    </div>
                    <?php else: ?>
                    <div class="alert alert-warning">
                        Nenhum arquivo selecionado.
                    </div>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </div>
    
    <div class="row">
        <div class="col-md-12">
            <div class="card">
                <div class="card-body">
                    <form method="POST" action="confirmar_postagem.php">
                        <div class="d-flex justify-content-between">
                            <a href="index.php" class="btn btn-outline-secondary">
                                <i class="fas fa-arrow-left me-2"></i> Voltar e Editar
                            </a>
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-calendar-check me-2"></i> Agendar Publicação
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
</div>

<?php require_once 'includes/footer.php'; ?>
