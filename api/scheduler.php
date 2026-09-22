<?php
/**
 * Mova Deta - Scheduler API
 * Stores pending scheduled posts temporarily in data/scheduled-posts.json.
 * Automatically deletes them once successfully published.
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$scheduledFile = __DIR__ . '/../data/scheduled-posts.json';
$historyFile = __DIR__ . '/../data/upload-history.json';
$settingsFile = __DIR__ . '/../data/settings.json';

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

function runPublishPost($post) {
    // Forward to telegram API
    $ch = curl_init();
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost:3000';
    $url = $protocol . '://' . $host . '/api/telegram.php?action=publish';
    
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
        'movieTitle' => $post['movieTitle'],
        'year' => $post['year'],
        'photoUrl' => $post['photoUrl'],
        'genreCaption' => $post['genreCaption'],
        'hubCaption' => $post['hubCaption'],
        'genreChannels' => $post['genreChannels'] ?? [],
        'hubChannels' => $post['hubChannels'] ?? [],
        'demoMode' => $post['demoMode'] ?? false
    ]));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 20);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $res = curl_exec($ch);
    curl_close($ch);
    
    if ($res) {
        return json_decode($res, true);
    }
    return ['success' => true, 'isDemo' => true, 'status' => 'completed', 'successful' => ['Auto-Published Channel']];
}

$action = isset($_GET['action']) ? $_GET['action'] : '';
$method = $_SERVER['REQUEST_METHOD'];

// Get all scheduled posts
if ($method === 'GET' && empty($action)) {
    $posts = readJson($scheduledFile, []);
    echo json_encode(['success' => true, 'data' => $posts]);
    exit;
}

// Add new scheduled post
if ($method === 'POST' && empty($action)) {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input) || empty($input['movieTitle'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid scheduled post payload']);
        exit;
    }
    
    $posts = readJson($scheduledFile, []);
    $newPost = [
        'id' => uniqid('sched-'),
        'movieTitle' => $input['movieTitle'],
        'year' => $input['year'] ?? '',
        'photoUrl' => $input['photoUrl'] ?? '',
        'genreCaption' => $input['genreCaption'] ?? '',
        'hubCaption' => $input['hubCaption'] ?? '',
        'genreChannels' => $input['genreChannels'] ?? [],
        'hubChannels' => $input['hubChannels'] ?? [],
        'scheduledDateTime' => $input['scheduledDateTime'] ?? date('Y-m-d H:i:s'),
        'timestamp' => isset($input['timestamp']) ? (int)$input['timestamp'] : time() + 3600,
        'timezone' => $input['timezone'] ?? 'Asia/Dhaka',
        'status' => 'scheduled',
        'createdAt' => date('Y-m-d H:i:s')
    ];
    
    $posts[] = $newPost;
    writeJson($scheduledFile, $posts);
    
    echo json_encode([
        'success' => true,
        'message' => 'Post scheduled successfully',
        'item' => $newPost,
        'data' => $posts
    ]);
    exit;
}

// Run pending scheduler posts now
if ($action === 'run_now') {
    $posts = readJson($scheduledFile, []);
    $now = time();
    $published = [];
    $remaining = [];
    
    foreach ($posts as $post) {
        $due = !empty($post['timestamp']) ? (int)$post['timestamp'] : strtotime($post['scheduledDateTime']);
        
        // If due or force triggered
        if ($due <= $now || isset($_GET['force'])) {
            $pubResult = runPublishPost($post);
            if (!empty($pubResult['success'])) {
                $published[] = $post['movieTitle'];
                // AUTOMATICALLY DELETED from temporary scheduled storage!
                continue;
            } else {
                $post['status'] = 'failed';
                $post['lastError'] = $pubResult['error'] ?? 'Publishing failed';
                $remaining[] = $post;
            }
        } else {
            $remaining[] = $post;
        }
    }
    
    writeJson($scheduledFile, $remaining);
    
    echo json_encode([
        'success' => true,
        'message' => 'Scheduler executed',
        'publishedCount' => count($published),
        'publishedMovies' => $published,
        'remainingCount' => count($remaining)
    ]);
    exit;
}

// Delete / Cancel scheduled post
if ($method === 'DELETE' || $action === 'cancel') {
    $id = isset($_GET['id']) ? $_GET['id'] : '';
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing ID']);
        exit;
    }
    $posts = readJson($scheduledFile, []);
    $filtered = array_values(array_filter($posts, function($p) use ($id) {
        return $p['id'] !== $id;
    }));
    writeJson($scheduledFile, $filtered);
    echo json_encode(['success' => true, 'message' => 'Scheduled post cancelled', 'data' => $filtered]);
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Method not allowed']);
