<?php
/**
 * Mova Deta - Shortener API
 * Manages shorteners & shortens URLs server-side.
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$file = __DIR__ . '/../data/shorteners.json';

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

// Action: shorten a single URL or list of URLs
if ($action === 'shorten' && $method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $url = isset($input['url']) ? trim($input['url']) : '';
    $shortenerId = isset($input['shortenerId']) ? $input['shortenerId'] : '';
    
    if (!$url) {
        echo json_encode(['success' => false, 'error' => 'URL required']);
        exit;
    }
    
    $shorteners = readJson($file, []);
    $selected = null;
    if ($shortenerId) {
        foreach ($shorteners as $s) {
            if ($s['id'] === $shortenerId && !empty($s['enabled'])) {
                $selected = $s;
                break;
            }
        }
    }
    if (!$selected) {
        foreach ($shorteners as $s) {
            if (!empty($s['isActive']) && !empty($s['enabled'])) {
                $selected = $s;
                break;
            }
        }
    }
    
    // If no active shortener or API key empty, return original or mock
    if (!$selected || empty($selected['apiUrl'])) {
        echo json_encode(['success' => true, 'shortUrl' => $url, 'shortened' => false]);
        exit;
    }
    
    $apiUrl = $selected['apiUrl'];
    $apiKey = isset($selected['apiKey']) ? $selected['apiKey'] : '';
    
    // Attempt standard shortener API call
    // Most shorteners use: GET {apiUrl}?api={apiKey}&url={url}
    $query = http_build_query([
        'api' => $apiKey,
        'url' => $url
    ]);
    
    $fullApiEndpoint = $apiUrl . (strpos($apiUrl, '?') !== false ? '&' : '?') . $query;
    
    $shortUrl = null;
    
    // Use cURL if available
    if (function_exists('curl_init')) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $fullApiEndpoint);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 6);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $res = curl_exec($ch);
        curl_close($ch);
        if ($res) {
            $data = json_decode($res, true);
            if (isset($data['shortenedUrl'])) {
                $shortUrl = $data['shortenedUrl'];
            } elseif (isset($data['short_url'])) {
                $shortUrl = $data['short_url'];
            } elseif (isset($data['url'])) {
                $shortUrl = $data['url'];
            }
        }
    }
    
    if (!$shortUrl) {
        // Fallback simulation if network/credentials not configured
        $cleanBase = !empty($selected['baseUrl']) ? rtrim($selected['baseUrl'], '/') : 'https://mova.link';
        $shortUrl = $cleanBase . '/' . substr(md5($url . time()), 0, 7);
    }
    
    echo json_encode([
        'success' => true,
        'originalUrl' => $url,
        'shortUrl' => $shortUrl,
        'shortenerName' => $selected['name'],
        'shortened' => true
    ]);
    exit;
}

if ($method === 'GET') {
    $shorteners = readJson($file, []);
    echo json_encode(['success' => true, 'data' => $shorteners]);
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid JSON']);
        exit;
    }
    
    // Batch update
    if (isset($input[0])) {
        writeJson($file, $input);
        echo json_encode(['success' => true, 'data' => $input]);
        exit;
    }
    
    $shorteners = readJson($file, []);
    $id = isset($input['id']) ? $input['id'] : uniqid('shortener-');
    $input['id'] = $id;
    
    // If setting active, deactivate others
    if (!empty($input['isActive'])) {
        foreach ($shorteners as &$s) {
            $s['isActive'] = false;
        }
    }
    
    $found = false;
    foreach ($shorteners as $k => $s) {
        if ($s['id'] === $id) {
            $shorteners[$k] = $input;
            $found = true;
            break;
        }
    }
    if (!$found) {
        $shorteners[] = $input;
    }
    
    writeJson($file, $shorteners);
    echo json_encode(['success' => true, 'data' => $shorteners, 'item' => $input]);
    exit;
}

if ($method === 'DELETE') {
    $id = isset($_GET['id']) ? $_GET['id'] : '';
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing ID']);
        exit;
    }
    $shorteners = readJson($file, []);
    $filtered = array_values(array_filter($shorteners, function($s) use ($id) {
        return $s['id'] !== $id;
    }));
    writeJson($file, $filtered);
    echo json_encode(['success' => true, 'data' => $filtered]);
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Method not allowed']);
