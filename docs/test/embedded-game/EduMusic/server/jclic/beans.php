<?php
// Simple JClic results endpoint for EduMúsic.
// Receives JClic reporter XML and stores activity results as JSON.

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

$payload = file_get_contents('php://input');
if ($payload === false || trim($payload) === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Empty payload']);
    exit;
}

// Wrap payload for XML parsing (JClic may send multiple bean nodes).
$wrapped = "<root>" . $payload . "</root>";
libxml_use_internal_errors(true);
$xml = simplexml_load_string($wrapped);
if ($xml === false) {
    $errors = array_map(function ($err) {
        return trim($err->message);
    }, libxml_get_errors());
    libxml_clear_errors();
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid XML', 'details' => $errors]);
    exit;
}

$activities = [];
foreach ($xml->xpath('//activity') as $activity) {
    $attrs = $activity->attributes();
    $activities[] = [
        'name' => (string)($attrs['name'] ?? ''),
        'score' => (int)($attrs['score'] ?? 0),
        'solved' => ((string)($attrs['solved'] ?? 'false')) === 'true',
        'actions' => (int)($attrs['actions'] ?? 0),
        'minActions' => (int)($attrs['minActions'] ?? 0),
        'timeMs' => (int)($attrs['time'] ?? 0),
    ];
}

$result = [
    'receivedAt' => gmdate('c'),
    'count' => count($activities),
    'activities' => $activities,
];

$dataDir = __DIR__ . '/data';
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0777, true);
}

$file = $dataDir . '/jclic-results.json';
$existing = [];
if (file_exists($file)) {
    $raw = file_get_contents($file);
    $decoded = json_decode($raw, true);
    if (is_array($decoded)) $existing = $decoded;
}
$existing[] = $result;
file_put_contents($file, json_encode($existing, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

echo json_encode(['ok' => true, 'stored' => $result]);
