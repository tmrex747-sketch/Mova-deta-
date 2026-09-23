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
    
    // Check if any parameter is a file upload
    $hasFile = false;
    foreach ($params as $k => $v) {
        if ($v instanceof CURLFile) {
            $hasFile = true;
            break;
        }
    }

    if (function_exists('curl_init')) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, true);
        if ($hasFile) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $params);
        } else {
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($params));
        }
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 20);
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
            'timeout' => 20
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
    $localImagePath = null;
    
    // Check if client provided botToken in payload
    $activeToken = !empty($input['botToken']) ? trim($input['botToken']) : $savedToken;
    if (!empty($input['botToken']) && empty($savedToken)) {
        $settings['telegramBotToken'] = $input['botToken'];
        @file_put_contents($settingsFile, json_encode($settings, JSON_PRETTY_PRINT));
        $savedToken = $input['botToken'];
    }

    // If photoUrl is base64 data URI (e.g. from Canvas Studio), save it to /uploads/posters/
    if (strpos($photoUrl, 'data:image/') === 0) {
        if (preg_match('/^data:image\/(\w+);base64,(.+)$/', $photoUrl, $matches)) {
            $ext = in_array(strtolower($matches[1]), ['png', 'webp', 'jpg', 'jpeg']) ? strtolower($matches[1]) : 'jpg';
            if ($ext === 'jpeg') $ext = 'jpg';
            $filename = 'mova_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
            $uploadDir = __DIR__ . '/../uploads/posters/';
            if (!is_dir($uploadDir)) {
                @mkdir($uploadDir, 0755, true);
            }
            $targetPath = $uploadDir . $filename;
            if (@file_put_contents($targetPath, base64_decode($matches[2]))) {
                $localImagePath = $targetPath;
                $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
                $host = $_SERVER['HTTP_HOST'] ?? 'localhost:3000';
                $photoUrl = $protocol . '://' . $host . '/uploads/posters/' . $filename;
            }
        }
    }
    
    $genreCaption = $input['genreCaption'] ?? '';
    $hubCaption = $input['hubCaption'] ?? '';
    $genreChannels = $input['genreChannels'] ?? [];
    $hubChannels = $input['hubChannels'] ?? [];
    $isDemo = empty($activeToken) || !empty($input['demoMode']);
    
    $successful = [];
    $failed = [];
    $results = [];

    // Helper to post to a Telegram channel with fallback support
    $postToChannel = function($chatId, $channelName, $captionText, $type) use ($activeToken, $isDemo, $photoUrl, $localImagePath, &$successful, &$failed, &$results) {
        if ($isDemo) {
            $successful[] = $channelName;
            $results[] = [
                'type' => $type,
                'channel' => $channelName,
                'chatId' => $chatId,
                'success' => true,
                'simulated' => true,
                'messageId' => rand(1000, 9999)
            ];
            return;
        }

        // 1. Try sending Photo if available
        if (!empty($photoUrl)) {
            $photoCaption = $captionText;
            if (mb_strlen($photoCaption) > 1020) {
                $photoCaption = mb_substr($photoCaption, 0, 1017) . '...';
            }

            $params = [
                'chat_id' => $chatId,
                'caption' => $photoCaption,
                'parse_mode' => 'HTML',
                'disable_web_page_preview' => false
            ];

            // If local file exists, upload directly via CURLFile to bypass InfinityFree hotlink/bot blocker
            if ($localImagePath && file_exists($localImagePath) && class_exists('CURLFile')) {
                $params['photo'] = new CURLFile($localImagePath);
            } else {
                $params['photo'] = $photoUrl;
            }

            $tgRes = telegramRequest($activeToken, 'sendPhoto', $params);
            if (!empty($tgRes['ok'])) {
                $successful[] = $channelName;
                $results[] = [
                    'type' => $type,
                    'channel' => $channelName,
                    'chatId' => $chatId,
                    'success' => true,
                    'messageId' => $tgRes['result']['message_id'] ?? null
                ];
                return;
            }
        }

        // 2. Fallback to sendMessage (up to 4096 characters)
        $textParams = [
            'chat_id' => $chatId,
            'text' => $captionText,
            'parse_mode' => 'HTML',
            'disable_web_page_preview' => false
        ];
        $tgRes = telegramRequest($activeToken, 'sendMessage', $textParams);

        if (!empty($tgRes['ok'])) {
            $successful[] = $channelName;
            $results[] = [
                'type' => $type,
                'channel' => $channelName,
                'chatId' => $chatId,
                'success' => true,
                'messageId' => $tgRes['result']['message_id'] ?? null
            ];
            return;
        }

        // If HTML parsing failed due to unclosed tags or special characters, retry without HTML
        if (!empty($tgRes['description']) && (stripos($tgRes['description'], 'parse') !== false || stripos($tgRes['description'], 'entity') !== false)) {
            $textParams['text'] = strip_tags($captionText);
            unset($textParams['parse_mode']);
            $retryRes = telegramRequest($activeToken, 'sendMessage', $textParams);
            if (!empty($retryRes['ok'])) {
                $successful[] = $channelName;
                $results[] = [
                    'type' => $type,
                    'channel' => $channelName,
                    'chatId' => $chatId,
                    'success' => true,
                    'messageId' => $retryRes['result']['message_id'] ?? null
                ];
                return;
            }
        }

        $failed[] = $channelName;
        $results[] = [
            'type' => $type,
            'channel' => $channelName,
            'chatId' => $chatId,
            'success' => false,
            'error' => $tgRes['description'] ?? 'Failed to post to Telegram'
        ];
    };
    
    // Publish to Genre Channels
    foreach ($genreChannels as $channel) {
        $chatId = $channel['chatId'] ?? $channel['username'] ?? '';
        $channelName = $channel['name'] ?? $chatId;
        $postToChannel($chatId, $channelName, $genreCaption, 'genre');
    }
    
    // Publish to Hub Channels
    foreach ($hubChannels as $hub) {
        $chatId = $hub['chatId'] ?? $hub['username'] ?? '';
        $hubName = $hub['name'] ?? $chatId;
        $postToChannel($chatId, $hubName, $hubCaption, 'hub');
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
