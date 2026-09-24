<?php
/**
 * Mova Deta - TMDB API Proxy & Live Multi-Search (Movies & Web Series / TV Shows)
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
$mediaType = isset($_GET['type']) ? trim($_GET['type']) : (isset($_POST['type']) ? trim($_POST['type']) : '');

// Comprehensive Genre Map for Movies & TV Shows
$genreMap = [
    28 => '#Action', 12 => '#Adventure', 16 => '#Animation', 35 => '#Comedy',
    80 => '#Crime', 99 => '#Documentary', 18 => '#Drama', 10751: '#Family',
    14 => '#Fantasy', 36 => '#History', 27 => '#Horror', 10402: '#Music',
    9648 => '#Mystery', 10749: '#Romance', 878 => '#SciFi', 10770: '#TVMovie',
    53 => '#Thriller', 10752: '#War', 37 => '#Western',
    // TV Show Specific Genres:
    10759 => '#Action', 10765 => '#SciFi', 10768 => '#War',
    10762 => '#Kids', 10763 => '#News', 10764 => '#Reality',
    10766 => '#Drama', 10767 => '#Talk'
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

/**
 * Intelligent Media Query Cleaner (removes torrent metadata, seasons, codecs)
 */
function cleanMediaSearchQuery($raw) {
    $cleaned = trim($raw);
    if (empty($cleaned)) return '';

    // 1. TMDB URLs (Movie or TV)
    if (stripos($cleaned, 'themoviedb.org/movie/') !== false || stripos($cleaned, 'themoviedb.org/tv/') !== false) {
        if (preg_match('/(?:movie|tv)\/(\d+)(?:-([^?#]+))?/i', $cleaned, $m)) {
            if (!empty($m[2])) return trim(str_replace(['-', '_', '+'], ' ', urldecode($m[2])));
            if (!empty($m[1])) return trim($m[1]);
        }
    }

    // 2. IMDb URLs
    if (stripos($cleaned, 'imdb.com/title/') !== false) {
        if (preg_match('/title\/(tt\d+)/i', $cleaned, $m)) {
            return $m[1];
        }
    }

    // 3. Remove extensions
    $cleaned = preg_replace('/\.(mkv|mp4|avi|mov|wmv|flv|webm|zip|rar|tar|iso)$/i', '', $cleaned);

    // 4. Remove brackets
    $cleaned = preg_replace('/\[[^\]]*\]/', ' ', $cleaned);
    $cleaned = preg_replace('/\((?!19\d\d|20\d\d)[^)]*\)/', ' ', $cleaned);

    // 5. Remove Season & Episode markers
    $cleaned = preg_replace('/\b(complete\s*(?:season|series)?|all\s*episodes?|season\s*\d+|s\d{1,2}(?:\s*[-–e]\s*\d{1,2})?|episode\s*\d+|ep\s*\d+|part\s*\d+)\b/i', ' ', $cleaned);

    // 6. Remove Quality, Codec & Audio tags
    $cleaned = preg_replace('/\b(2160p|1080p|720p|480p|360p|4k|2k|uhd|bluray|blu-ray|bdrip|brrip|webrip|web-dl|webdl|hdrip|dvdrip|hdtv|remux|proper|repack|unrated|extended|directors?\s*cut)\b/i', ' ', $cleaned);
    $cleaned = preg_replace('/\b(x264|x265|hevc|h264|h265|h\.264|h\.265|10bit|8bit|6ch|ddp5\.1|dts|ac3|aac|atmos)\b/i', ' ', $cleaned);

    // 7. Remove OTT Platforms & Subtitle tags
    $cleaned = preg_replace('/\b(amzn|amazon|netflix|nf|dsnp|disney|hotstar|zee5|sonyliv|jiocinema|hoichoi|chorki|esub|multisub|subs?)\b/i', ' ', $cleaned);

    // 8. Remove common audio language descriptors
    $cleaned = preg_replace('/\b(dual\s*audio|multi\s*audio|clean\s*audio)\b/i', ' ', $cleaned);

    // 9. Remove audio language if title has enough words
    $withoutLang = trim(preg_replace('/\b(hindi|bengali|bangla|english|tamil|telugu|malayalam|kannada)\b/i', ' ', $cleaned));
    if (strlen(preg_replace('/[^a-zA-Z0-9]/', '', $withoutLang)) >= 3) {
        $cleaned = $withoutLang;
    }

    // 10. Clean separators
    $cleaned = trim(preg_replace('/\s+/', ' ', str_replace(['.', '_', '-', '+'], ' ', $cleaned)));

    return !empty($cleaned) ? $cleaned : trim($raw);
}

function formatTmdbItem($item, $genreMap) {
    $isTv = (isset($item['media_type']) && $item['media_type'] === 'tv') || (!empty($item['name']) && empty($item['title']));
    $title = !empty($item['title']) ? $item['title'] : (!empty($item['name']) ? $item['name'] : (!empty($item['original_title']) ? $item['original_title'] : (!empty($item['original_name']) ? $item['original_name'] : 'Untitled')));
    $releaseDate = !empty($item['release_date']) ? $item['release_date'] : (!empty($item['first_air_date']) ? $item['first_air_date'] : '');
    $year = !empty($releaseDate) ? substr($releaseDate, 0, 4) : '';
    
    $backdrop = !empty($item['backdrop_path']) 
        ? 'https://image.tmdb.org/t/p/w1280' . $item['backdrop_path']
        : (!empty($item['poster_path']) ? 'https://image.tmdb.org/t/p/w780' . $item['poster_path'] : '');
    $poster = !empty($item['poster_path']) ? 'https://image.tmdb.org/t/p/w780' . $item['poster_path'] : $backdrop;
    
    $genres = [];
    if (!empty($item['genre_ids']) && is_array($item['genre_ids'])) {
        foreach ($item['genre_ids'] as $gid) {
            if (isset($genreMap[$gid])) $genres[] = $genreMap[$gid];
        }
    }
    if ($isTv && !in_array('#WebSeries', $genres) && !in_array('#Series', $genres)) {
        array_unshift($genres, '#WebSeries');
    }
    if (empty($genres)) {
        $genres = $isTv ? ['#WebSeries', '#Drama'] : ['#Action', '#Drama'];
    }
    
    return [
        'id' => $item['id'],
        'media_type' => $isTv ? 'tv' : 'movie',
        'title' => trim($title),
        'year' => $year,
        'release_date' => $releaseDate,
        'backdrop_path' => $backdrop,
        'poster_path' => $poster,
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

// 2. ACTION: Movie & TV Show Backdrops
if ($action === 'images') {
    $images = [];
    $targetId = $movieId ? $movieId : $rawQuery;

    if ($apiKey && is_numeric($targetId)) {
        $endpointsToTry = ($mediaType === 'tv')
            ? ['/tv/' . urlencode($targetId) . '/images', '/movie/' . urlencode($targetId) . '/images']
            : ['/movie/' . urlencode($targetId) . '/images', '/tv/' . urlencode($targetId) . '/images'];

        foreach ($endpointsToTry as $ep) {
            $res = fetchTmdb($ep, $apiKey);
            if ($res['code'] === 200 && !empty($res['data'])) {
                $json = json_decode($res['data'], true);
                if (!empty($json['backdrops']) && is_array($json['backdrops'])) {
                    foreach (array_slice($json['backdrops'], 0, 15) as $b) {
                        if (!empty($b['file_path'])) {
                            $fullUrl = 'https://image.tmdb.org/t/p/w1280' . $b['file_path'];
                            if (!in_array($fullUrl, $images)) {
                                $images[] = $fullUrl;
                            }
                        }
                    }
                    if (!empty($images)) break;
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

// 3. ACTION: Search & Live Browsing (Movies & Web Series)
$query = cleanMediaSearchQuery($rawQuery);

// High quality offline sample library with both Web Series & Movies
$sampleMovies = [
    // Top Web Series
    [
        'id' => 87108,
        'title' => 'Mirzapur',
        'year' => '2018',
        'release_date' => '2018-11-16',
        'media_type' => 'tv',
        'backdrop_path' => 'https://image.tmdb.org/t/p/w1280/uGy4DCBqB11QZspv0FqjVd9gGzY.jpg',
        'poster_path' => 'https://image.tmdb.org/t/p/w780/h9zy0pA6Xl2aXgPjL6T4vG2L6rX.jpg',
        'imdb_rating' => '8.5',
        'category' => 'tv_shows',
        'genres' => ['#WebSeries', '#Crime', '#Action', '#Thriller']
    ],
    [
        'id' => 101314,
        'title' => 'Panchayat',
        'year' => '2020',
        'release_date' => '2020-04-03',
        'media_type' => 'tv',
        'backdrop_path' => 'https://image.tmdb.org/t/p/w1280/lG7xZ94lU5H2T8y3S9H9L4xV7H.jpg',
        'poster_path' => 'https://image.tmdb.org/t/p/w780/6WnB4G1u4bYt2lK4f5jR3Y1l1j.jpg',
        'imdb_rating' => '8.9',
        'category' => 'tv_shows',
        'genres' => ['#WebSeries', '#Comedy', '#Drama']
    ],
    [
        'id' => 1399,
        'title' => 'Game of Thrones',
        'year' => '2011',
        'release_date' => '2011-04-17',
        'media_type' => 'tv',
        'backdrop_path' => 'https://image.tmdb.org/t/p/w1280/2OMB0ynKlyIenMJWI2Dy9IWT4c.jpg',
        'poster_path' => 'https://image.tmdb.org/t/p/w780/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg',
        'imdb_rating' => '9.2',
        'category' => 'tv_shows',
        'genres' => ['#WebSeries', '#Fantasy', '#Action', '#Drama']
    ],
    [
        'id' => 66732,
        'title' => 'Stranger Things',
        'year' => '2016',
        'release_date' => '2016-07-15',
        'media_type' => 'tv',
        'backdrop_path' => 'https://image.tmdb.org/t/p/w1280/56v2KjBlU4XaOv9rVYEQypROD7P.jpg',
        'poster_path' => 'https://image.tmdb.org/t/p/w780/49WJfeN0moxb9IPfGn8AIqMGskD.jpg',
        'imdb_rating' => '8.7',
        'category' => 'tv_shows',
        'genres' => ['#WebSeries', '#SciFi', '#Mystery', '#Horror']
    ],
    [
        'id' => 1396,
        'title' => 'Breaking Bad',
        'year' => '2008',
        'release_date' => '2008-01-20',
        'media_type' => 'tv',
        'backdrop_path' => 'https://image.tmdb.org/t/p/w1280/9faGSFi5jam6pDWGNd0p8J2FA1E.jpg',
        'poster_path' => 'https://image.tmdb.org/t/p/w780/ztkUQFLlC19CCMYHW9o1zWhJvU9.jpg',
        'imdb_rating' => '9.5',
        'category' => 'tv_shows',
        'genres' => ['#WebSeries', '#Crime', '#Drama', '#Thriller']
    ],
    [
        'id' => 71446,
        'title' => 'Money Heist (La Casa de Papel)',
        'year' => '2017',
        'release_date' => '2017-05-02',
        'media_type' => 'tv',
        'backdrop_path' => 'https://image.tmdb.org/t/p/w1280/gFZri2YbFUxgN8NXsgagrHR90J5.jpg',
        'poster_path' => 'https://image.tmdb.org/t/p/w780/reEMJA1uzscCbk5r6iG054457vF.jpg',
        'imdb_rating' => '8.2',
        'category' => 'tv_shows',
        'genres' => ['#WebSeries', '#Action', '#Crime', '#Thriller']
    ],
    [
        'id' => 70523,
        'title' => 'Dark',
        'year' => '2017',
        'release_date' => '2017-12-01',
        'media_type' => 'tv',
        'backdrop_path' => 'https://image.tmdb.org/t/p/w1280/3lBDg3i6nn5R2NKICJ797KPIG52.jpg',
        'poster_path' => 'https://image.tmdb.org/t/p/w780/apbrWgAQn1292yh3aWpA40g9l1A.jpg',
        'imdb_rating' => '8.8',
        'category' => 'tv_shows',
        'genres' => ['#WebSeries', '#SciFi', '#Mystery', '#Crime']
    ],
    [
        'id' => 84958,
        'title' => 'Loki',
        'year' => '2021',
        'release_date' => '2021-06-09',
        'media_type' => 'tv',
        'backdrop_path' => 'https://image.tmdb.org/t/p/w1280/k47JEUTQsSMN539RhdggDCgr425.jpg',
        'poster_path' => 'https://image.tmdb.org/t/p/w780/voHUmlvjysv9yB0v3N8b5eL7H.jpg',
        'imdb_rating' => '8.2',
        'category' => 'tv_shows',
        'genres' => ['#WebSeries', '#Action', '#Adventure', '#SciFi']
    ],
    // Top Movies
    [
        'id' => 872906,
        'title' => 'Jawan',
        'year' => '2023',
        'release_date' => '2023-09-07',
        'media_type' => 'movie',
        'backdrop_path' => 'https://image.tmdb.org/t/p/w1280/jXJxMcVoTTj5H6PAuAlXg7W0iXx.jpg',
        'poster_path' => 'https://image.tmdb.org/t/p/w780/jF0m9f3q9QZ6V0wQG7C9F9G1Q.jpg',
        'imdb_rating' => '7.2',
        'category' => 'bollywood',
        'genres' => ['#Action', '#Thriller']
    ],
    [
        'id' => 786892,
        'title' => 'Animal',
        'year' => '2023',
        'release_date' => '2023-12-01',
        'media_type' => 'movie',
        'backdrop_path' => 'https://image.tmdb.org/t/p/w1280/9wX972sM5k6p1h2b0V5Z4F0wQG7.jpg',
        'poster_path' => 'https://image.tmdb.org/t/p/w780/hr95v8tQAImgsen329vYfdDRJIZ.jpg',
        'imdb_rating' => '6.8',
        'category' => 'bollywood',
        'genres' => ['#Action', '#Drama', '#Crime']
    ],
    [
        'id' => 801688,
        'title' => 'Kalki 2898 AD',
        'year' => '2024',
        'release_date' => '2024-06-27',
        'media_type' => 'movie',
        'backdrop_path' => 'https://image.tmdb.org/t/p/w1280/2RVcJbWFmICSD6Kcb71d1j7L6La.jpg',
        'poster_path' => 'https://image.tmdb.org/t/p/w780/9wX972sM5k6p1h2b0V5Z4F0wQG7.jpg',
        'imdb_rating' => '7.8',
        'category' => 'south',
        'genres' => ['#SciFi', '#Action', '#Fantasy']
    ],
    [
        'id' => 533535,
        'title' => 'Deadpool & Wolverine',
        'year' => '2024',
        'release_date' => '2024-07-26',
        'media_type' => 'movie',
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
        'media_type' => 'movie',
        'backdrop_path' => 'https://image.tmdb.org/t/p/w1280/xOMo8BRK7PfcJv9JCnx7s520b4q.jpg',
        'poster_path' => 'https://image.tmdb.org/t/p/w780/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
        'imdb_rating' => '8.6',
        'category' => 'hollywood',
        'genres' => ['#SciFi', '#Adventure', '#Action']
    ],
    [
        'id' => 76600,
        'title' => 'Avatar: The Way of Water',
        'year' => '2022',
        'release_date' => '2022-12-16',
        'media_type' => 'movie',
        'backdrop_path' => 'https://image.tmdb.org/t/p/w1280/14QbnygCuTO0vl7CAFmPf1fgZfV.jpg',
        'poster_path' => 'https://image.tmdb.org/t/p/w780/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg',
        'imdb_rating' => '7.6',
        'category' => 'hollywood',
        'genres' => ['#Action', '#Adventure', '#SciFi']
    ],
    [
        'id' => 872585,
        'title' => 'Oppenheimer',
        'year' => '2023',
        'release_date' => '2023-07-21',
        'media_type' => 'movie',
        'backdrop_path' => 'https://image.tmdb.org/t/p/w1280/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg',
        'poster_path' => 'https://image.tmdb.org/t/p/w780/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
        'imdb_rating' => '8.9',
        'category' => 'top_rated',
        'genres' => ['#Drama', '#History', '#Biography']
    ]
];

// LIVE TMDB FETCH
if ($apiKey) {
    $endpoint = '';
    if ($query) {
        if ($category === 'tv_shows') {
            $endpoint = '/search/tv?query=' . urlencode($query) . '&include_adult=false';
        } else {
            // Multi search searches BOTH Movies & TV Shows
            $endpoint = '/search/multi?query=' . urlencode($query) . '&include_adult=false';
        }
    } else {
        if ($category === 'trending' || !$category) {
            $endpoint = '/trending/all/day';
        } elseif ($category === 'tv_shows') {
            $endpoint = '/trending/tv/day';
        } elseif ($category === 'top_rated') {
            $endpoint = '/movie/top_rated';
        } elseif ($category === 'bollywood') {
            $endpoint = '/discover/movie?with_original_language=hi&sort_by=popularity.desc';
        } elseif ($category === 'hollywood') {
            $endpoint = '/discover/movie?with_original_language=en&sort_by=popularity.desc';
        } elseif ($category === 'south') {
            $endpoint = '/discover/movie?with_original_language=te|ta|ml|kn&sort_by=popularity.desc';
        } else {
            $endpoint = '/trending/all/day';
        }
    }

    $res = fetchTmdb($endpoint, $apiKey);
    if ($res['code'] === 200 && !empty($res['data'])) {
        $json = json_decode($res['data'], true);
        if (!empty($json['results']) && is_array($json['results'])) {
            $results = [];
            foreach ($json['results'] as $item) {
                // Ignore person search results in multi search
                if (isset($item['media_type']) && $item['media_type'] === 'person') {
                    continue;
                }
                if (empty($item['title']) && empty($item['name'])) {
                    continue;
                }
                $results[] = formatTmdbItem($item, $genreMap);
            }
            if (!empty($results)) {
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
}

// Fallback to sampleMovies if TMDB key is empty or request failed
$pool = $sampleMovies;
if ($category && $category !== 'all') {
    if ($category === 'tv_shows') {
        $pool = array_values(array_filter($sampleMovies, function($m) {
            return ($m['media_type'] === 'tv' || $m['category'] === 'tv_shows');
        }));
    } else {
        $pool = array_values(array_filter($sampleMovies, function($m) use ($category) {
            return ($m['category'] === $category || $category === 'trending');
        }));
    }
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
    $isLikelySeries = (bool)preg_match('/series|season|part|ep/i', $rawQuery);
    $filtered = [[
        'id' => rand(100000, 999999),
        'title' => ucwords($query),
        'year' => date('Y'),
        'release_date' => date('Y-m-d'),
        'media_type' => $isLikelySeries ? 'tv' : 'movie',
        'backdrop_path' => 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1280&q=80',
        'poster_path' => 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=780&q=80',
        'imdb_rating' => '7.8',
        'category' => $isLikelySeries ? 'tv_shows' : 'trending',
        'genres' => $isLikelySeries ? ['#WebSeries', '#Drama', '#Thriller'] : ['#Action', '#Thriller', '#Adventure']
    ]];
}

echo json_encode([
    'success' => true,
    'results' => $filtered,
    'source' => 'magic_library',
    'cleanedQuery' => $query
]);
exit;
