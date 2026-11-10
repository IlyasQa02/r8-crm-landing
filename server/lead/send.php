<?php
/*
 * Заявки с лендинга R8 CRM -> письмо на info@webmoika.kz через SMTP ящика info@.
 *
 * Принимает POST от обеих форм лендинга: угловой «Перезвоним за 15 минут» (form=callback)
 * и «Запишитесь на демо» (form=demo). Отвечает JSON {ok, message}.
 *
 * Логин и пароль SMTP лежат в config.php рядом (его нет в репозитории, см. config.example.php).
 * Внешних библиотек не нужно: SMTP-клиент встроен ниже.
 */

declare(strict_types=1);

$cfgFile = __DIR__ . '/config.php';
if (!is_file($cfgFile)) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'message' => 'Не настроен config.php'], JSON_UNESCAPED_UNICODE);
    exit;
}
$cfg = require $cfgFile;

/* ---------- CORS: страницу открывают с GitHub Pages и с webmoika.kz ---------- */
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $cfg['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Max-Age: 86400');
}
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

header('Content-Type: application/json; charset=utf-8');

function reply(int $code, bool $ok, string $msg): void {
    http_response_code($code);
    echo json_encode(['ok' => $ok, 'message' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

/** Одна строка без тегов и переводов строк, не длиннее $max символов. */
function field(string $key, int $max = 100): string {
    $v = isset($_POST[$key]) ? (string)$_POST[$key] : '';
    $v = strip_tags(trim($v));
    $v = preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $v) ?? '';
    return mb_substr($v, 0, $max, 'UTF-8');
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    reply(405, false, 'Неверный запрос.');
}
if ($origin !== '' && !in_array($origin, $cfg['allowed_origins'], true)) {
    reply(403, false, 'Неверный запрос.');
}

// Скрытое поле-ловушка: человек его не видит, бот заполняет. Боту отвечаем «ок» и ничего не шлём.
if (field('website') !== '') {
    reply(200, true, 'Спасибо!');
}

$form  = field('form', 20) === 'demo' ? 'demo' : 'callback';
$name  = field('name', 80);
$phone = field('phone', 30);

if (strlen(preg_replace('/\D/', '', $phone) ?? '') < 10) {
    reply(400, false, 'Укажите телефон полностью.');
}

/* ---------- ограничение частоты с одного IP, чтобы ящик не завалили спамом ---------- */
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rlDir = sys_get_temp_dir() . '/r8-lead-rl';
@mkdir($rlDir, 0700, true);
$rlFile = $rlDir . '/' . md5($ip);
$now = time();
$hits = [];
if (is_file($rlFile)) {
    $hits = array_filter(
        array_map('intval', explode(',', (string)@file_get_contents($rlFile))),
        fn($t) => $t > $now - $cfg['rate_window_sec']
    );
}
if (count($hits) >= $cfg['rate_max']) {
    reply(429, false, 'Слишком много заявок. Позвоните нам: +7 701 722 02 15');
}
$hits[] = $now;
@file_put_contents($rlFile, implode(',', $hits), LOCK_EX);

/* ---------- текст письма ---------- */
$subject = ($form === 'demo' ? 'Заявка на демо R8 CRM' : 'Обратный звонок R8 CRM') . ': ' . $phone;

$lines = [];
$lines[] = 'Имя: ' . ($name !== '' ? $name : 'не указано');
$lines[] = 'Телефон: ' . $phone;
if ($form === 'demo') {
    $lines[] = 'Боксов: ' . field('boxes', 40);
    $lines[] = 'Камеры в боксах: ' . field('cameras', 40);
    $lines[] = 'Тариф: ' . field('plan', 60);
}
$lines[] = '';
$lines[] = 'Форма: ' . ($form === 'demo' ? '«Запишитесь на демо»' : '«Перезвоним за 15 минут»');
$lines[] = 'Время: ' . (new DateTime('now', new DateTimeZone('Asia/Almaty')))->format('d.m.Y H:i');
$lines[] = 'Страница: ' . field('page', 300);
$lines[] = 'IP: ' . $ip;
$body = implode("\r\n", $lines);

try {
    smtp_send($cfg, $cfg['mail_to'], $subject, $body);
} catch (Throwable $e) {
    error_log('[r8-lead] ' . $e->getMessage());
    reply(502, false, 'Не удалось отправить заявку.');
}

reply(200, true, 'Спасибо! Перезвоним в течение 15 минут.');


/* ====================== минимальный SMTP-клиент ====================== */

function mime_header(string $s): string {
    return '=?UTF-8?B?' . base64_encode($s) . '?=';
}

function smtp_send(array $cfg, string $to, string $subject, string $body): void {
    $secure = $cfg['smtp_secure']; // 'ssl' (порт 465) или 'tls' (STARTTLS, порт 587)
    $ctx = stream_context_create(['ssl' => [
        'verify_peer'      => true,
        'verify_peer_name' => true,
        'peer_name'        => $cfg['smtp_host'],
    ]]);
    $remote = ($secure === 'ssl' ? 'ssl://' : 'tcp://') . $cfg['smtp_host'] . ':' . $cfg['smtp_port'];
    $fp = @stream_socket_client($remote, $errno, $errstr, 15, STREAM_CLIENT_CONNECT, $ctx);
    if (!$fp) {
        throw new RuntimeException("connect $remote: $errstr ($errno)");
    }
    stream_set_timeout($fp, 15);

    $read = function () use ($fp): array {
        $data = '';
        while (($line = fgets($fp, 1024)) !== false) {
            $data .= $line;
            if (strlen($line) < 4 || $line[3] === ' ') break;
        }
        return [(int)substr($data, 0, 3), $data];
    };
    $cmd = function (?string $line, array $expect, string $what) use ($fp, $read): void {
        if ($line !== null) fwrite($fp, $line . "\r\n");
        [$code, $resp] = $read();
        if (!in_array($code, $expect, true)) {
            throw new RuntimeException("SMTP $what: " . trim($resp));
        }
    };

    $helo = $_SERVER['SERVER_NAME'] ?? 'webmoika.kz';
    $cmd(null, [220], 'greeting');
    $cmd("EHLO $helo", [250], 'EHLO');
    if ($secure === 'tls') {
        $cmd('STARTTLS', [220], 'STARTTLS');
        if (!stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT | STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT)) {
            throw new RuntimeException('STARTTLS handshake failed');
        }
        $cmd("EHLO $helo", [250], 'EHLO after TLS');
    }
    $cmd('AUTH LOGIN', [334], 'AUTH');
    $cmd(base64_encode($cfg['smtp_user']), [334], 'AUTH user');
    $cmd(base64_encode($cfg['smtp_pass']), [235], 'AUTH password');
    $cmd('MAIL FROM:<' . $cfg['smtp_user'] . '>', [250], 'MAIL FROM');
    $cmd('RCPT TO:<' . $to . '>', [250, 251], 'RCPT TO');
    $cmd('DATA', [354], 'DATA');

    $domain = substr(strrchr($cfg['smtp_user'], '@') ?: '@webmoika.kz', 1);
    $headers = [
        'Date: ' . date('r'),
        'From: ' . mime_header($cfg['from_name']) . ' <' . $cfg['smtp_user'] . '>',
        'To: <' . $to . '>',
        'Subject: ' . mime_header($subject),
        'Message-ID: <' . bin2hex(random_bytes(12)) . '@' . $domain . '>',
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
    ];
    // base64-тело: в нём нет строк, начинающихся с точки, dot-stuffing не нужен
    $msg = implode("\r\n", $headers) . "\r\n\r\n" . rtrim(chunk_split(base64_encode($body), 76, "\r\n")) . "\r\n.";
    $cmd($msg, [250], 'message');
    fwrite($fp, "QUIT\r\n");
    fclose($fp);
}
