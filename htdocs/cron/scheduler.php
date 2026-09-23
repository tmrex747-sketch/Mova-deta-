<?php
/**
 * Mova Deta - Cron Scheduler Execution Script
 * 
 * Setup on cPanel / InfinityFree / Linux Crontab:
 * * * * * * php -q /path/to/htdocs/cron/scheduler.php >/dev/null 2>&1
 * OR
 * * * * * * curl -s https://yourdomain.infinityfreeapp.com/cron/scheduler.php >/dev/null 2>&1
 */

header('Content-Type: application/json; charset=utf-8');

$scheduledFile = __DIR__ . '/../data/scheduled-posts.json';
$historyFile = __DIR__ . '/../data/upload-history.json';
$settingsFile = __DIR__ . '/../data/settings.json';

if (!file_exists($scheduledFile)) {
    echo json_encode(['status' => 'ok', 'message' => 'No scheduled-posts.json file']);
    exit;
}

$scheduledContent = file_get_contents($scheduledFile);
$posts = json_decode($scheduledContent, true);

if (empty($posts) || !is_array($posts)) {
    echo json_encode(['status' => 'idle', 'message' => 'No pending scheduled posts']);
    exit;
}

$settings = file_exists($settingsFile) ? json_decode(file_get_contents($settingsFile), true) : [];
$botToken = $settings['telegramBotToken'] ?? '';

$now = time();
$published = [];
$remaining = [];

function tgSend($token, $method, $params) {
    if (empty($token)) {
        return ['ok' => true, 'result' => ['message_id' => rand(1000, 9999)], 'simulated' => true];
    }
    $url = "https://api.telegram.org/bot{$token}/{$method}";
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
    return $res ? json_decode($res, true) : ['ok' => false];
}

foreach ($posts as $post) {
    $dueTime = !empty($post['timestamp']) ? (int)$post['timestamp'] : strtotime($post['scheduledDateTime'] ?? 'now');
    
    if ($dueTime <= $now) {
        $successful = [];
        $failed = [];
        
        // Publish to genre channels
        foreach ($post['genreChannels'] ?? [] as $ch) {
            $chatId = $ch['chatId'] ?? $ch['username'] ?? '';
            $params = [
                'chat_id' => $chatId,
                'caption' => $post['genreCaption'] ?? '',
                'parse_mode' => 'HTML',
                'disable_web_page_preview' => false
            ];
            if (!empty($post['photoUrl'])) {
                $params['photo'] = $post['photoUrl'];
                $r = tgSend($botToken, 'sendPhoto', $params);
            } else {
                unset($params['caption']);
                $params['text'] = $post['genreCaption'] ?? '';
                $r = tgSend($botToken, 'sendMessage', $params);
            }
            if (!empty($r['ok'])) {
                $successful[] = $ch['name'] ?? $chatId;
            } else {
                $failed[] = $ch['name'] ?? $chatId;
            }
        }
        
        // Publish to hub channels
        foreach ($post['hubChannels'] ?? [] as $hub) {
            $chatId = $hub['chatId'] ?? $hub['username'] ?? '';
            $params = [
                'chat_id' => $chatId,
                'caption' => $post['hubCaption'] ?? '',
                'parse_mode' => 'HTML',
                'disable_web_page_preview' => false
            ];
            if (!empty($post['photoUrl'])) {
                $params['photo'] = $post['photoUrl'];
                $r = tgSend($botToken, 'sendPhoto', $params);
            } else {
                unset($params['caption']);
                $params['text'] = $post['hubCaption'] ?? '';
                $r = tgSend($botToken, 'sendMessage', $params);
            }
            if (!empty($r['ok'])) {
                $successful[] = $hub['name'] ?? $chatId;
            } else {
                $failed[] = $hub['name'] ?? $chatId;
            }
        }
        
        $postStatus = empty($failed) ? 'completed' : (!empty($successful) ? 'partial' : 'failed');
        
        // Log to history
        $histRecord = [
            'id' => uniqid('hist-'),
            'title' => $post['movieTitle'],
            'year' => $post['year'] ?? '',
            'timestamp' => round(microtime(true) * 1000),
            'dateStr' => date('Y-m-d H:i:s'),
            'genreChannelNames' => array_column($post['genreChannels'] ?? [], 'name'),
            'hubChannelNames' => array_column($post['hubChannels'] ?? [], 'name'),
            'status' => $postStatus,
            'successfulChannels' => $successful,
            'failedChannels' => $failed,
            'scheduledPublished' => true
        ];
        
        $hist = file_exists($historyFile) ? json_decode(file_get_contents($historyFile), true) : [];
        if (!is_array($hist)) $hist = [];
        array_unshift($hist, $histRecord);
        file_put_contents($historyFile, json_encode(array_slice($hist, 0, 100), JSON_PRETTY_PRINT));
        
        if ($postStatus !== 'failed') {
            // AUTOMATICALLY DELETED after successful publishing!
            $published[] = $post['movieTitle'];
            continue;
        } else {
            $post['status'] = 'failed';
            $remaining[] = $post;
        }
    } else {
        $remaining[] = $post;
    }
}

file_put_contents($scheduledFile, json_encode($remaining, JSON_PRETTY_PRINT));

echo json_encode([
    'status' => 'completed',
    'timestamp' => date('Y-m-d H:i:s'),
    'published' => $published,
    'remaining' => count($remaining)
]);
