<?php
/**
 * Mova Deta - Telegram API Bot Gateway
 * Handles getMe, sendPhoto, sendMessage with HTML formatting.
 * Never exposes raw bot tokens to errors.
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$settingsFile = __DIR__ . '/../data/settings.json';
$historyFile = __DIR__ . '/../data/upload-history.json';

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

$settings = readJson($settingsFile, []);
$savedToken = !empty($settings['telegramBotToken']) ? trim($settings['telegramBotToken']) : '';

$action = isset($_GET['action']) ? $_GET['action'] : '';
$method = $_SERVER['REQUEST_METHOD'];

function telegramRequest($token, $method, $params = []) {
    $url = "https://api.telegram.org/bot{$token}/{$method}";
    
    if (function_exists('curl_init')) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($params));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $res = curl_exec($ch);
        $err = curl_error($ch);
        curl_close($ch);
        if ($res) {
            return json_decode($res, true);
        }
        return ['ok' => false, 'description' => $err ?: 'cURL request failed'];
    }
    
    $opts = [
        'http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
            'content' => http_build_query($params),
            'timeout' => 15
        ]
    ];
    $ctx = stream_context_create($opts);
    $res = @file_get_contents($url, false, $ctx);
    if ($res) {
        return json_decode($res, true);
    }
    return ['ok' => false, 'description' => 'HTTP request failed'];
}

// 1. Test Bot Connection
if ($action === 'test' || $action === 'validate') {
    $tokenToTest = $savedToken;
    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!empty($input['botToken'])) {
            $tokenToTest = trim($input['botToken']);
        }
    }
    
    if (empty($tokenToTest)) {
        echo json_encode([
            'success' => false,
            'isDemo' => true,
            'message' => 'No Telegram Bot Token configured. Operating in DEMO MODE.'
        ]);
        exit;
    }
    
    $res = telegramRequest($tokenToTest, 'getMe');
    if (!empty($res['ok'])) {
        echo json_encode([
            'success' => true,
            'isDemo' => false,
            'bot' => $res['result'],
            'message' => 'Connected to @' . ($res['result']['username'] ?? 'Bot')
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'isDemo' => false,
            'error' => $res['description'] ?? 'Invalid Bot Token or Telegram API unreachable'
        ]);
    }
    exit;
}

// 2. Publish to channels
if ($action === 'publish' && $method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid JSON']);
        exit;
    }
    
    $movieTitle = $input['movieTitle'] ?? 'Untitled Movie';
    $year = $input['year'] ?? '';
    $photoUrl = $input['photoUrl'] ?? '';
    $genreCaption = $input['genreCaption'] ?? '';
    $hubCaption = $input['hubCaption'] ?? '';
    $genreChannels = $input['genreChannels'] ?? [];
    $hubChannels = $input['hubChannels'] ?? [];
    $isDemo = empty($savedToken) || !empty($input['demoMode']);
    
    $successful = [];
    $failed = [];
    $results = [];
    
    // Publish to Genre Channels
    foreach ($genreChannels as $channel) {
        $chatId = $channel['chatId'] ?? $channel['username'] ?? '';
        $channelName = $channel['name'] ?? $chatId;
        
        if ($isDemo) {
            // Simulated Telegram Response
            $successful[] = $channelName;
            $results[] = [
                'type' => 'genre',
                'channel' => $channelName,
                'chatId' => $chatId,
                'success' => true,
                'simulated' => true,
                'messageId' => rand(1000, 9999)
            ];
            continue;
        }
        
        // Real Telegram Post via sendPhoto or sendMessage
        $params = [
            'chat_id' => $chatId,
            'caption' => $genreCaption,
            'parse_mode' => 'HTML',
            'disable_web_page_preview' => false
        ];
        
        if (!empty($photoUrl)) {
            $params['photo'] = $photoUrl;
            $tgRes = telegramRequest($savedToken, 'sendPhoto', $params);
        } else {
            unset($params['caption']);
            $params['text'] = $genreCaption;
            $tgRes = telegramRequest($savedToken, 'sendMessage', $params);
        }
        
        if (!empty($tgRes['ok'])) {
            $successful[] = $channelName;
            $results[] = [
                'type' => 'genre',
                'channel' => $channelName,
                'chatId' => $chatId,
                'success' => true,
                'messageId' => $tgRes['result']['message_id'] ?? null
            ];
        } else {
            $failed[] = $channelName;
            $results[] = [
                'type' => 'genre',
                'channel' => $channelName,
                'chatId' => $chatId,
                'success' => false,
                'error' => $tgRes['description'] ?? 'Failed to post'
            ];
        }
    }
    
    // Publish to Hub Channels
    foreach ($hubChannels as $hub) {
        $chatId = $hub['chatId'] ?? $hub['username'] ?? '';
        $hubName = $hub['name'] ?? $chatId;
        
        if ($isDemo) {
            $successful[] = $hubName;
            $results[] = [
                'type' => 'hub',
                'channel' => $hubName,
                'chatId' => $chatId,
                'success' => true,
                'simulated' => true,
                'messageId' => rand(1000, 9999)
            ];
            continue;
        }
        
        $params = [
            'chat_id' => $chatId,
            'caption' => $hubCaption,
            'parse_mode' => 'HTML',
            'disable_web_page_preview' => false
        ];
        
        if (!empty($photoUrl)) {
            $params['photo'] = $photoUrl;
            $tgRes = telegramRequest($savedToken, 'sendPhoto', $params);
        } else {
            unset($params['caption']);
            $params['text'] = $hubCaption;
            $tgRes = telegramRequest($savedToken, 'sendMessage', $params);
        }
        
        if (!empty($tgRes['ok'])) {
            $successful[] = $hubName;
            $results[] = [
                'type' => 'hub',
                'channel' => $hubName,
                'chatId' => $chatId,
                'success' => true,
                'messageId' => $tgRes['result']['message_id'] ?? null
            ];
        } else {
            $failed[] = $hubName;
            $results[] = [
                'type' => 'hub',
                'channel' => $hubName,
                'chatId' => $chatId,
                'success' => false,
                'error' => $tgRes['description'] ?? 'Failed to post'
            ];
        }
    }
    
    // Overall status
    $status = 'completed';
    if (empty($successful) && !empty($failed)) {
        $status = 'failed';
    } elseif (!empty($successful) && !empty($failed)) {
        $status = 'partial';
    }
    
    // Lightweight history recording (NO permanent storage of download links, synopsis, or posters!)
    $genreNames = array_map(function($c) { return $c['name'] ?? ''; }, $genreChannels);
    $hubNames = array_map(function($h) { return $h['name'] ?? ''; }, $hubChannels);
    
    $historyRecord = [
        'id' => uniqid('hist-'),
        'title' => $movieTitle,
        'year' => $year,
        'timestamp' => round(microtime(true) * 1000),
        'dateStr' => date('Y-m-d H:i:s'),
        'genreChannelNames' => array_values(array_filter($genreNames)),
        'hubChannelNames' => array_values(array_filter($hubNames)),
        'status' => $status,
        'successfulChannels' => $successful,
        'failedChannels' => $failed,
        'isDemo' => $isDemo
    ];
    
    $history = readJson($historyFile, []);
    array_unshift($history, $historyRecord);
    // Keep max 100 lightweight history records
    if (count($history) > 100) {
        $history = array_slice($history, 0, 100);
    }
    writeJson($historyFile, $history);
    
    echo json_encode([
        'success' => ($status !== 'failed'),
        'status' => $status,
        'isDemo' => $isDemo,
        'successful' => $successful,
        'failed' => $failed,
        'results' => $results,
        'historyRecord' => $historyRecord
    ]);
    exit;
}

http_response_code(400);
echo json_encode(['success' => false, 'error' => 'Invalid action']);
