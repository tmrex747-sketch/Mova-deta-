<?php
/**
 * Mova Deta - TMDB API Proxy & Live Movie Search
 * Dual Support for v3 API Keys & v4 Bearer Access Tokens
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-TMDB-Key');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$settingsFile = __DIR__ . '/../data/settings.json';
$settings = file_exists($settingsFile) ? json_decode(file_get_contents($settingsFile), true) : [];

// Check passed apiKey from GET, POST, or stored settings
$apiKey = '';
if (!empty($_GET['apiKey'])) {
    $apiKey = trim($_GET['apiKey']);
} elseif (!empty($_POST['apiKey'])) {
    $apiKey = trim($_POST['apiKey']);
} else {
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    if (!empty($headers['X-TMDB-Key'])) {
        $apiKey = trim($headers['X-TMDB-Key']);
    } elseif (!empty($headers['x-tmdb-key'])) {
        $apiKey = trim($headers['x-tmdb-key']);
    } elseif (!empty($settings['tmdbApiKey'])) {
        $apiKey = trim($settings['tmdbApiKey']);
    }
}
$apiKey = trim($apiKey, " \t\n\r\0\x0B'\"");

$action = isset($_GET['action']) ? $_GET['action'] : (isset($_POST['action']) ? $_POST['action'] : 'search');
$rawQuery = isset($_GET['query']) ? trim($_GET['query']) : (isset($_POST['query']) ? trim($_POST['query']) : '');
$category = isset($_GET['category']) ? trim($_GET['category']) : (isset($_POST['category']) ? trim($_POST['category']) : '');
$movieId = isset($_GET['id']) ? trim($_GET['id']) : (isset($_POST['id']) ? trim($_POST['id']) : '');

// Genre map for TMDB
$genreMap = [
    28 => '#Action', 12 => '#Adventure', 16 => '#Animation', 35 => '#Comedy',
    80 => '#Crime', 99 => '#Documentary', 18 => '#Drama', 10751 => '#Family',
    14 => '#Fantasy', 36 => '#History', 27 => '#Horror', 10402 => '#Music',
    9648 => '#Mystery', 10749 => '#Romance', 878 => '#SciFi', 10770 => '#TVMovie',
    53 => '#Thriller', 10752 => '#War', 37 => '#Western'
];

/**
 * Universal TMDB Fetcher (Supports v3 API Key & v4 Bearer Tokens)
 */
function fetchTmdb($endpoint, $apiKey) {
    $cleanKey = trim($apiKey, " \t\n\r\0\x0B'\"");
    $isBearer = (strpos($cleanKey, 'ey') === 0 || strlen($cleanKey) > 45);
    $sep = (strpos($endpoint, '?') !== false) ? '&' : '?';
    
    $url = $isBearer
        ? 'https://api.themoviedb.org/3' . $endpoint
        : 'https://api.themoviedb.org/3' . $endpoint . $sep . 'api_key=' . urlencode($cleanKey);
    
    $headers = [
        'Accept: application/json',
        'User-Agent: MovaDeta/2.0 (InfinityFree/PHP)'
    ];
    if ($isBearer) {
        $headers[] = 'Authorization: Bearer ' . $cleanKey;
    }

    if (function_exists('curl_init')) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $res = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return ['code' => $httpCode, 'data' => $res];
    }

    $opts = [
        'http' => [
            'method' => 'GET',
            'header' => implode("\r\n", $headers),
            'timeout' => 10,
            'ignore_errors' => true
        ]
    ];
    $context = stream_context_create($opts);
    $res = @file_get_contents($url, false, $context);
    return ['code' => $res ? 200 : 500, 'data' => $res];
}

function formatTmdbItem($item, $genreMap) {
    $year = !empty($item['release_date']) ? substr($item['release_date'], 0, 4) : '';
    $backdrop = !empty($item['backdrop_path']) 
        ? 'https://image.tmdb.org/t/p/w1280' . $item['backdrop_path']
        : (!empty($item['poster_path']) ? 'https://image.tmdb.org/t/p/w780' . $item['poster_path'] : '');
    
    $genres = [];
    if (!empty($item['genre_ids']) && is_array($item['genre_ids'])) {
        foreach ($item['genre_ids'] as $gid) {
            if (isset($genreMap[$gid])) $genres[] = $genreMap[$gid];
        }
    }
    if (empty($genres)) $genres = ['#Action', '#Drama'];
    
    return [
        'id' => $item['id'],
        'title' => !empty($item['title']) ? $item['title'] : (!empty($item['original_title']) ? $item['original_title'] : 'Untitled'),
        'year' => $year,
        'release_date' => $item['release_date'] ?? '',
        'backdrop_path' => $backdrop,
        'poster_path' => !empty($item['poster_path']) ? 'https://image.tmdb.org/t/p/w780' . $item['poster_path'] : $backdrop,
        'imdb_rating' => !empty($item['vote_average']) ? number_format($item['vote_average'], 1) : '7.5',
        'genres' => $genres
    ];
}

// 1. ACTION: Test Connection
if ($action === 'test' || $action === 'validate') {
    if (!$apiKey) {
        echo json_encode([
            'success' => false,
            'isDemo' => true,
            'error' => 'কোনো TMDB API Key পাওয়া যায়নি। Settings এ গিয়ে আপনার API Key দিন।'
        ]);
        exit;
    }

    $res = fetchTmdb('/configuration', $apiKey);
    if ($res['code'] === 200 && !empty($res['data'])) {
        $json = json_decode($res['data'], true);
        if (!empty($json['images']) || !empty($json['change_keys'])) {
            echo json_encode([
                'success' => true,
                'isDemo' => false,
                'message' => '✓ TMDB API Key সফলভাবে যাচাই হয়েছে এবং সক্রিয় রয়েছে!'
            ]);
            exit;
        }
    }

    $errMsg = 'TMDB API Key ভুল বা অনুমোদনহীন (401 Unauthorized)';
    if (!empty($res['data'])) {
        $j = json_decode($res['data'], true);
        if (!empty($j['status_message'])) {
            $errMsg = $j['status_message'];
        }
    }
    echo json_encode([
        'success' => false,
        'isDemo' => false,
        'error' => $errMsg
    ]);
    exit;
}

// 2. ACTION: Movie Backdrops
if ($action === 'images') {
    $images = [];
    $targetId = $movieId ? $movieId : $rawQuery;

    if ($apiKey && is_numeric($targetId)) {
        $res = fetchTmdb('/movie/' . urlencode($targetId) . '/images', $apiKey);
        if ($res['code'] === 200 && !empty($res['data'])) {
            $json = json_decode($res['data'], true);
            if (!empty($json['backdrops'])) {
                foreach (array_slice($json['backdrops'], 0, 15) as $b) {
                    if (!empty($b['file_path'])) {
                        $images[] = 'https://image.tmdb.org/t/p/w1280' . $b['file_path'];
                    }
                }
            }
        }
    }

    if (empty($images)) {
        $images = [
            'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1280&q=80',
            'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1280&q=80',
            'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1280&q=80',
            'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=1280&q=80',
            'https://images.unsplash.com/photo-1574267432553-4b4628081c31?auto=format&fit=crop&w=1280&q=80'
        ];
    }

    echo json_encode(['success' => true, 'images' => $images]);
    exit;
}

// 3. ACTION: Search & Live Browsing
// Built-in sample movies for offline fallback
$sampleMovies = [
    [
        'id' => 76600,
        'title' => 'Avatar: The Way of Water',
        'year' => '2022',
        'release_date' => '2022-12-16',
        'backdrop_path' => 'https://image.tmdb.org/t/p/w1280/14QbnygCuTO0vl7CAFmPf1fgZfV.jpg',
        'poster_path' => 'https://image.tmdb.org/t/p/w780/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg',
        'imdb_rating' => '7.6',
        'category' => 'hollywood',
        'genres' => ['#Action', '#Adventure', '#SciFi']
    ],
    [
        'id' => 533535,
        'title' => 'Deadpool & Wolverine',
        'year' => '2024',
        'release_date' => '2024-07-26',
        'backdrop_path' => 'https://image.tmdb.org/t/p/w1280/yDHYTjA3R0neEjMMBE4p3v1GhaT.jpg',
        'poster_path' => 'https://image.tmdb.org/t/p/w780/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg',
        'imdb_rating' => '7.9',
        'category' => 'hollywood',
        'genres' => ['#Action', '#Comedy', '#SciFi']
    ],
    [
        'id' => 693134,
        'title' => 'Dune: Part Two',
        'year' => '2024',
        'release_date' => '2024-03-01',
        'backdrop_path' => 'https://image.tmdb.org/t/p/w1280/xOMo8BRK7PfcJv9JCnx7s520b4q.jpg',
        'poster_path' => 'https://image.tmdb.org/t/p/w780/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
        'imdb_rating' => '8.6',
        'category' => 'hollywood',
        'genres' => ['#SciFi', '#Adventure', '#Action']
    ],
    [
        'id' => 1022789,
        'title' => 'Inside Out 2',
        'year' => '2024',
        'release_date' => '2024-06-14',
        'backdrop_path' => 'https://image.tmdb.org/t/p/w1280/stKGOmPAgpnw4Lpn5gX7L1qHq7t.jpg',
        'poster_path' => 'https://image.tmdb.org/t/p/w780/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg',
        'imdb_rating' => '7.7',
        'category' => 'trending',
        'genres' => ['#Animation', '#Family', '#Comedy']
    ],
    [
        'id' => 573435,
        'title' => 'Bad Boys: Ride or Die',
        'year' => '2024',
        'release_date' => '2024-06-07',
        'backdrop_path' => 'https://image.tmdb.org/t/p/w1280/ga4OLm4qLx1VTY0jU6UMgXFvE1E.jpg',
        'poster_path' => 'https://image.tmdb.org/t/p/w780/nP6RliHjxsz4irTKsxe8FRhKZYl.jpg',
        'imdb_rating' => '6.9',
        'category' => 'hollywood',
        'genres' => ['#Action', '#Comedy', '#Crime']
    ],
    [
        'id' => 872585,
        'title' => 'Oppenheimer',
        'year' => '2023',
        'release_date' => '2023-07-21',
        'backdrop_path' => 'https://image.tmdb.org/t/p/w1280/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg',
        'poster_path' => 'https://image.tmdb.org/t/p/w780/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
        'imdb_rating' => '8.9',
        'category' => 'top_rated',
        'genres' => ['#Drama', '#History', '#Biography']
    ],
    [
        'id' => 945961,
        'title' => 'Alien: Romulus',
        'year' => '2024',
        'release_date' => '2024-08-16',
        'backdrop_path' => 'https://image.tmdb.org/t/p/w1280/9SSEUrSqhljBMzRe4aBTh17rUaC.jpg',
        'poster_path' => 'https://image.tmdb.org/t/p/w780/b33nnKl12vfwh49HGqB0x8ORGFm.jpg',
        'imdb_rating' => '7.4',
        'category' => 'hollywood',
        'genres' => ['#Horror', '#SciFi', '#Thriller']
    ],
    [
        'id' => 872906,
        'title' => 'Jawan',
        'year' => '2023',
        'release_date' => '2023-09-07',
        'backdrop_path' => 'https://image.tmdb.org/t/p/w1280/jXJxMcVoTTj5H6PAuAlXg7W0iXx.jpg',
        'poster_path' => 'https://image.tmdb.org/t/p/w780/jF0m9f3q9QZ6V0wQG7C9F9G1Q.jpg',
        'imdb_rating' => '7.2',
        'category' => 'bollywood',
        'genres' => ['#Action', '#Thriller']
    ],
    [
        'id' => 801688,
        'title' => 'Kalki 2898 AD',
        'year' => '2024',
        'release_date' => '2024-06-27',
        'backdrop_path' => 'https://image.tmdb.org/t/p/w1280/2RVcJbWFmICSD6Kcb71d1j7L6La.jpg',
        'poster_path' => 'https://image.tmdb.org/t/p/w780/9wX972sM5k6p1h2b0V5Z4F0wQG7.jpg',
        'imdb_rating' => '7.8',
        'category' => 'south',
        'genres' => ['#SciFi', '#Action', '#Fantasy']
    ]
];

// Clean query
$query = $rawQuery;
if (strpos($query, 'themoviedb.org/movie/') !== false) {
    if (preg_match('/movie\/(\d+)(?:-([^?#]+))?/', $query, $matches)) {
        if (!empty($matches[2])) {
            $query = str_replace('-', ' ', $matches[2]);
        }
    }
} elseif (strpos($query, 'imdb.com/title/') !== false) {
    if (preg_match('/title\/(tt\d+)/', $query, $matches)) {
        $query = $matches[1];
    }
} else {
    $query = preg_replace('/\b(1080p|720p|480p|2160p|4k|2k|uhd|bluray|bdrip|webrip|web-dl|hdrip|dvdrip|x264|x265|hevc|aac|dts|h264|esub|multi|dual\s*audio|hindi|bengali|english)\b/i', '', $query);
    $query = trim(preg_replace('/\s+/', ' ', str_replace(['.', '_', '-', '+'], ' ', $query)));
}

// LIVE TMDB FETCH
if ($apiKey) {
    $endpoint = '';
    if ($query) {
        $endpoint = '/search/movie?query=' . urlencode($query) . '&include_adult=false';
    } else {
        if ($category === 'trending' || !$category) {
            $endpoint = '/trending/movie/day';
        } elseif ($category === 'top_rated') {
            $endpoint = '/movie/top_rated';
        } elseif ($category === 'bollywood') {
            $endpoint = '/discover/movie?with_original_language=hi&sort_by=popularity.desc';
        } elseif ($category === 'hollywood') {
            $endpoint = '/discover/movie?with_original_language=en&sort_by=popularity.desc';
        } elseif ($category === 'south') {
            $endpoint = '/discover/movie?with_original_language=te|ta|ml|kn&sort_by=popularity.desc';
        } else {
            $endpoint = '/movie/popular';
        }
    }

    $res = fetchTmdb($endpoint, $apiKey);
    if ($res['code'] === 200 && !empty($res['data'])) {
        $json = json_decode($res['data'], true);
        if (!empty($json['results']) && is_array($json['results'])) {
            $results = [];
            foreach ($json['results'] as $item) {
                $results[] = formatTmdbItem($item, $genreMap);
            }
            echo json_encode([
                'success' => true,
                'results' => $results,
                'source' => 'tmdb_live',
                'cleanedQuery' => $query
            ]);
            exit;
        }
    }
}

// Fallback to sampleMovies if TMDB key is empty or request failed
$pool = $sampleMovies;
if ($category && $category !== 'all') {
    $pool = array_values(array_filter($sampleMovies, function($m) use ($category) {
        return ($m['category'] === $category || $category === 'trending');
    }));
    if (empty($pool)) $pool = $sampleMovies;
}

if (!$query) {
    echo json_encode(['success' => true, 'results' => $pool, 'source' => 'magic_library']);
    exit;
}

$filtered = array_values(array_filter($sampleMovies, function($m) use ($query) {
    return stripos($m['title'], $query) !== false;
}));

if (empty($filtered)) {
    $filtered = [[
        'id' => rand(100000, 999999),
        'title' => ucwords($query),
        'year' => date('Y'),
        'release_date' => date('Y-m-d'),
        'backdrop_path' => 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1280&q=80',
        'poster_path' => 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=780&q=80',
        'imdb_rating' => '7.8',
        'genres' => ['#Action', '#Thriller', '#Adventure']
    ]];
}

echo json_encode([
    'success' => true,
    'results' => $filtered,
    'source' => 'magic_library',
    'cleanedQuery' => $query
]);
exit;
