<?php
/**
 * Mova Deta - Channels API (Genre & Hub)
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$type = isset($_GET['type']) ? $_GET['type'] : 'genre';
$file = ($type === 'hub') ? __DIR__ . '/../data/hub-channels.json' : __DIR__ . '/../data/genre-channels.json';

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
    $channels = readJson($file, []);
    echo json_encode(['success' => true, 'data' => $channels]);
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid JSON']);
        exit;
    }
    
    // If input is an array of channels (batch update / import)
    if (isset($input[0]) || empty($input)) {
        writeJson($file, $input);
        echo json_encode(['success' => true, 'data' => $input]);
        exit;
    }
    
    // Single channel add or update
    $channels = readJson($file, []);
    $id = isset($input['id']) ? $input['id'] : uniqid(($type === 'hub' ? 'hub-' : 'gc-'));
    $input['id'] = $id;
    
    $found = false;
    foreach ($channels as $k => $c) {
        if ($c['id'] === $id) {
            $channels[$k] = $input;
            $found = true;
            break;
        }
    }
    if (!$found) {
        $channels[] = $input;
    }
    
    writeJson($file, $channels);
    echo json_encode(['success' => true, 'data' => $channels, 'item' => $input]);
    exit;
}

if ($method === 'DELETE') {
    $id = isset($_GET['id']) ? $_GET['id'] : '';
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing channel ID']);
        exit;
    }
    $channels = readJson($file, []);
    $filtered = array_values(array_filter($channels, function($c) use ($id) {
        return $c['id'] !== $id;
    }));
    writeJson($file, $filtered);
    echo json_encode(['success' => true, 'data' => $filtered]);
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Method not allowed']);
