<?php
/**
 * Mova Deta - TMDB API Proxy & Movie Search
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
$settings = file_exists($settingsFile) ? json_decode(file_get_contents($settingsFile), true) : [];
$apiKey = !empty($settings['tmdbApiKey']) ? $settings['tmdbApiKey'] : '';

$action = isset($_GET['action']) ? $_GET['action'] : 'search';
$rawQuery = isset($_GET['query']) ? trim($_GET['query']) : '';
$category = isset($_GET['category']) ? trim($_GET['category']) : '';
$id = isset($_GET['id']) ? trim($_GET['id']) : '';

// TMDB Magic URL & Release String cleaner
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
    // Strip common release tags
    $query = preg_replace('/\b(1080p|720p|480p|2160p|4k|2k|uhd|bluray|bdrip|webrip|web-dl|hdrip|dvdrip|x264|x265|hevc|aac|dts|h264|esub|multi|dual\s*audio|hindi|bengali|english)\b/i', '', $query);
    $query = trim(preg_replace('/\s+/', ' ', str_replace(['.', '_', '-', '+'], ' ', $query)));
}

// Built-in sample movies library for instant offline/demo testing
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

function fetchUrl($url) {
    if (function_exists('curl_init')) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 6);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $res = curl_exec($ch);
        curl_close($ch);
        return $res;
    }
    return @file_get_contents($url);
}

// Genre map for TMDB
$genreMap = [
    28 => '#Action', 12 => '#Adventure', 16 => '#Animation', 35 => '#Comedy',
    80 => '#Crime', 99 => '#Documentary', 18 => '#Drama', 10751 => '#Family',
    14 => '#Fantasy', 36 => '#History', 27 => '#Horror', 10402 => '#Music',
    9648 => '#Mystery', 10749 => '#Romance', 878 => '#SciFi', 10770 => '#TVMovie',
    53 => '#Thriller', 10752 => '#War', 37 => '#Western'
];

// Handle Fetch Multiple Backdrops Action
if ($action === 'images') {
    $images = [];
    $movieId = $id ? $id : $query;

    if ($apiKey && is_numeric($movieId)) {
        $url = 'https://api.themoviedb.org/3/movie/' . urlencode($movieId) . '/images?api_key=' . urlencode($apiKey);
        $raw = fetchUrl($url);
        if ($raw) {
            $json = json_decode($raw, true);
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

if ($action === 'search') {
    if (!$query) {
        echo json_encode(['success' => true, 'results' => $sampleMovies]);
        exit;
    }
    
    // If real TMDB API key is provided
    if ($apiKey) {
        $url = 'https://api.themoviedb.org/3/search/movie?api_key=' . urlencode($apiKey) . '&query=' . urlencode($query) . '&include_adult=false';
        $raw = fetchUrl($url);
        if ($raw) {
            $json = json_decode($raw, true);
            if (!empty($json['results'])) {
                $results = [];
                foreach ($json['results'] as $item) {
                    $year = !empty($item['release_date']) ? substr($item['release_date'], 0, 4) : '';
                    $backdrop = !empty($item['backdrop_path']) 
                        ? 'https://image.tmdb.org/t/p/w1280' . $item['backdrop_path']
                        : (!empty($item['poster_path']) ? 'https://image.tmdb.org/t/p/w780' . $item['poster_path'] : '');
                    
                    $genres = [];
                    if (!empty($item['genre_ids'])) {
                        foreach ($item['genre_ids'] as $gid) {
                            if (isset($genreMap[$gid])) $genres[] = $genreMap[$gid];
                        }
                    }
                    if (empty($genres)) $genres = ['#Action', '#Drama'];
                    
                    $results[] = [
                        'id' => $item['id'],
                        'title' => $item['title'],
                        'year' => $year,
                        'release_date' => $item['release_date'] ?? '',
                        'backdrop_path' => $backdrop,
                        'poster_path' => !empty($item['poster_path']) ? 'https://image.tmdb.org/t/p/w780' . $item['poster_path'] : $backdrop,
                        'imdb_rating' => !empty($item['vote_average']) ? number_format($item['vote_average'], 1) : '7.5',
                        'genres' => $genres
                    ];
                }
                echo json_encode(['success' => true, 'results' => $results, 'source' => 'tmdb_live']);
                exit;
            }
        }
    }
    
    // Fallback: search in sampleMovies
    $filtered = array_values(array_filter($sampleMovies, function($m) use ($query) {
        return stripos($m['title'], $query) !== false;
    }));
    
    // If query didn't match any sample, generate custom simulation record
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
    
    echo json_encode(['success' => true, 'results' => $filtered, 'source' => 'sample_library']);
    exit;
}

http_response_code(400);
echo json_encode(['success' => false, 'error' => 'Invalid action']);
