<?php
/**
 * Mova Deta - Promotions API
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$file = __DIR__ . '/../data/promotions.json';

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

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $promos = readJson($file, []);
    echo json_encode(['success' => true, 'data' => $promos]);
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid JSON']);
        exit;
    }
    
    if (isset($input[0])) {
        writeJson($file, $input);
        echo json_encode(['success' => true, 'data' => $input]);
        exit;
    }
    
    $promos = readJson($file, []);
    $id = isset($input['id']) ? $input['id'] : uniqid('promo-');
    $input['id'] = $id;
    
    $found = false;
    foreach ($promos as $k => $p) {
        if ($p['id'] === $id) {
            $promos[$k] = $input;
            $found = true;
            break;
        }
    }
    if (!$found) {
        $promos[] = $input;
    }
    
    writeJson($file, $promos);
    echo json_encode(['success' => true, 'data' => $promos, 'item' => $input]);
    exit;
}

if ($method === 'DELETE') {
    $id = isset($_GET['id']) ? $_GET['id'] : '';
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing ID']);
        exit;
    }
    $promos = readJson($file, []);
    $filtered = array_values(array_filter($promos, function($p) use ($id) {
        return $p['id'] !== $id;
    }));
    writeJson($file, $filtered);
    echo json_encode(['success' => true, 'data' => $filtered]);
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Method not allowed']);
