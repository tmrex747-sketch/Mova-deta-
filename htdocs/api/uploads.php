<?php
/**
 * Mova Deta - Poster Uploads & History API
 * Manages temporary image uploads & lightweight history records.
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$historyFile = __DIR__ . '/../data/upload-history.json';
$uploadDir = __DIR__ . '/../uploads/posters/';

if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

function readJson($path, $default = []) {
    if (!file_exists($path)) return $default;
    $content = file_get_contents($path);
    $decoded = json_decode($content, true);
    return is_array($decoded) ? $decoded : $default;
}

function writeJson($path, $data) {
    $dir = dirname($path);
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    $fp = fopen($path, 'w');
    if (!$fp) return false;
    if (flock($fp, LOCK_EX)) {
        fwrite($fp, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        fflush($fp);
        flock($fp, LOCK_UN);
        fclose($fp);
        return true;
    }
    fclose($fp);
    return false;
}

$action = isset($_GET['action']) ? $_GET['action'] : '';
$method = $_SERVER['REQUEST_METHOD'];

// Handle Image Upload (drag-and-drop or file upload)
if ($action === 'poster' && $method === 'POST') {
    if (!empty($_FILES['poster']) && $_FILES['poster']['error'] === UPLOAD_ERR_OK) {
        $file = $_FILES['poster'];
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp'])) {
            $ext = 'jpg';
        }
        $filename = 'mova_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
        $targetPath = $uploadDir . $filename;
        
        if (move_uploaded_file($file['tmp_name'], $targetPath)) {
            $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
            $host = $_SERVER['HTTP_HOST'] ?? 'localhost:3000';
            $publicUrl = $protocol . '://' . $host . '/uploads/posters/' . $filename;
            
            echo json_encode([
                'success' => true,
                'url' => $publicUrl,
                'filename' => $filename
            ]);
            exit;
        }
    }
    
    // Also support base64 upload in JSON
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true);
    if (!empty($input['base64'])) {
        $data = $input['base64'];
        if (preg_match('/^data:image\/(\w+);base64,/', $data, $type)) {
            $data = substr($data, strpos($data, ',') + 1);
            $type = strtolower($type[1]);
            if (!in_array($type, ['jpg', 'jpeg', 'png', 'webp'])) {
                $type = 'jpg';
            }
            $data = base64_decode($data);
            if ($data !== false) {
                $filename = 'mova_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $type;
                file_put_contents($uploadDir . $filename, $data);
                $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
                $host = $_SERVER['HTTP_HOST'] ?? 'localhost:3000';
                $publicUrl = $protocol . '://' . $host . '/uploads/posters/' . $filename;
                
                echo json_encode([
                    'success' => true,
                    'url' => $publicUrl,
                    'filename' => $filename
                ]);
                exit;
            }
        }
    }
    
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'No valid image file uploaded']);
    exit;
}

// History actions
if ($action === 'history' || empty($action)) {
    if ($method === 'GET') {
        $history = readJson($historyFile, []);
        $filter = isset($_GET['filter']) ? $_GET['filter'] : '';
        $search = isset($_GET['search']) ? trim(strtolower($_GET['search'])) : '';
        
        if ($filter) {
            $history = array_values(array_filter($history, function($h) use ($filter) {
                return ($h['status'] ?? '') === $filter;
            }));
        }
        if ($search) {
            $history = array_values(array_filter($history, function($h) use ($search) {
                return stripos($h['title'] ?? '', $search) !== false;
            }));
        }
        
        echo json_encode(['success' => true, 'data' => $history]);
        exit;
    }
    
    if ($method === 'DELETE') {
        $id = isset($_GET['id']) ? $_GET['id'] : '';
        $history = readJson($historyFile, []);
        if ($id === 'all') {
            writeJson($historyFile, []);
            echo json_encode(['success' => true, 'message' => 'History cleared']);
            exit;
        }
        $filtered = array_values(array_filter($history, function($h) use ($id) {
            return ($h['id'] ?? '') !== $id;
        }));
        writeJson($historyFile, $filtered);
        echo json_encode(['success' => true, 'data' => $filtered]);
        exit;
    }
}

http_response_code(400);
echo json_encode(['success' => false, 'error' => 'Invalid action']);
