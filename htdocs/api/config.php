<?php
/**
 * Mova Deta - Configuration & Settings API
 * InfinityFree & standard PHP compatible.
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$dataFile = __DIR__ . '/../data/settings.json';

function readJson($path, $default = []) {
    if (!file_exists($path)) {
        return $default;
    }
    $content = file_get_contents($path);
    $decoded = json_decode($content, true);
    return is_array($decoded) ? $decoded : $default;
}

function writeJson($path, $data) {
    $dir = dirname($path);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
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
    $settings = readJson($dataFile, [
        'telegramBotToken' => '',
        'telegramBotUsername' => '',
        'canvasBrandingName' => "MOVA DETA\nCINEMA HUB\nJOIN @MOVADETAOFFICIAL",
        'howToDownloadUrl' => 'https://t.me/MovaDetaHowToDownload',
        'howToDownloadEnabled' => true,
        'tmdbApiKey' => '',
        'defaultLanguage' => 'Hindi',
        'defaultGenres' => ['#Action', '#Thriller'],
        'autoPreview' => true,
        'autoClearForm' => false,
        'pinLockEnabled' => false,
        'pinCode' => '',
        'timezone' => 'Asia/Dhaka',
        'isDemoMode' => false
    ]);
    
    // Mask bot token partially for frontend security if desired, or return as configured
    echo json_encode([
        'success' => true,
        'data' => $settings
    ]);
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid JSON body']);
        exit;
    }
    
    $current = readJson($dataFile, []);
    $updated = array_merge($current, $input);
    
    if (writeJson($dataFile, $updated)) {
        echo json_encode([
            'success' => true,
            'message' => 'Settings saved successfully',
            'data' => $updated
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to save settings to server storage']);
    }
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Method not allowed']);
