<?php
/*
 * Заявки с лендинга R8 CRM -> письмо на info@webmoika.kz через SMTP ящика info@.
 *
 * Принимает POST от обеих форм лендинга: угловой «Перезвоним за 15 минут» (form=callback)
 * и «Запишитесь на демо» (form=demo). Отвечает JSON {ok, message}.
 *
 * Логин и пароль SMTP лежат в config.php рядом (его нет в репозитории, см. config.example.php).
 * Внешних библиотек не нужно: SMTP-клиент встроен ниже. Работает на PHP 5.6+.
 */

function reply($code, $ok, $msg) {
    http_response_code($code);
    if (!headers_sent()) header('Content-Type: application/json; charset=utf-8');
    echo json_encode(array('ok' => $ok, 'message' => $msg));
    exit;
}

function srv($key, $default = '') {
    return isset($_SERVER[$key]) ? (string)$_SERVER[$key] : $default;
}

/** Обрезка строки по символам (UTF-8), даже если на хостинге нет mbstring. */
function cut($s, $max) {
    if (function_exists('mb_substr')) return mb_substr($s, 0, $max, 'UTF-8');
    if (function_exists('iconv_substr')) return (string)iconv_substr($s, 0, $max, 'UTF-8');
    return substr($s, 0, $max * 2);
}

/** Одна строка без тегов и управляющих символов, не длиннее $max символов. */
function field($key, $max = 100) {
    $v = isset($_POST[$key]) ? (string)$_POST[$key] : '';
    $v = strip_tags(trim($v));
    $v = preg_replace('/[\x00-\x1F\x7F]+/', ' ', $v);
    return cut((string)$v, $max);
}

$cfgFile = __DIR__ . '/config.php';
if (!is_file($cfgFile)) {
    reply(500, false, 'Не настроен config.php');
}
$cfg = require $cfgFile;
if (!is_array($cfg)) {
    reply(500, false, 'config.php должен возвращать массив (return [...])');
}

/* ---------- CORS: страницу открывают с GitHub Pages и с webmoika.kz ---------- */
$origin = srv('HTTP_ORIGIN');
$allowed = in_array($origin, $cfg['allowed_origins'], true);
if ($allowed) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Max-Age: 86400');
}
$method = srv('REQUEST_METHOD');
if ($method === 'OPTIONS') {
    http_response_code(204);
    exit;
}
if ($method !== 'POST') {
    reply(405, false, 'Неверный запрос.');
}
if ($origin !== '' && !$allowed) {
    reply(403, false, 'Неверный запрос.');
}

// Скрытое поле-ловушка: человек его не видит, бот заполняет. Боту отвечаем «ок» и ничего не шлём.
if (field('website') !== '') {
    reply(200, true, 'Спасибо!');
}

$form  = field('form', 20) === 'demo' ? 'demo' : 'callback';
$name  = field('name', 80);
$phone = field('phone', 30);

if (strlen(preg_replace('/\D/', '', $phone)) < 10) {
    reply(400, false, 'Укажите телефон полностью.');
}

/* ---------- ограничение частоты с одного IP, чтобы ящик не завалили спамом ---------- */
$ip = srv('REMOTE_ADDR', 'unknown');
$rlDir = sys_get_temp_dir() . '/r8-lead-rl';
@mkdir($rlDir, 0700, true);
$rlFile = $rlDir . '/' . md5($ip);
$now = time();
$hits = array();
if (is_file($rlFile)) {
    foreach (explode(',', (string)@file_get_contents($rlFile)) as $t) {
        $t = (int)$t;
        if ($t > $now - (int)$cfg['rate_window_sec']) $hits[] = $t;
    }
}
if (count($hits) >= (int)$cfg['rate_max']) {
    reply(429, false, 'Слишком много заявок. Позвоните нам: +7 701 722 02 15');
}
$hits[] = $now;
@file_put_contents($rlFile, implode(',', $hits), LOCK_EX);

/* ---------- текст письма ---------- */
$subject = ($form === 'demo' ? 'Заявка на демо R8 CRM' : 'Обратный звонок R8 CRM') . ': ' . $phone;

$tz = new DateTimeZone('Asia/Almaty');
$when = new DateTime('now', $tz);

$lines = array();
$lines[] = 'Имя: ' . ($name !== '' ? $name : 'не указано');
$lines[] = 'Телефон: ' . $phone;
if ($form === 'demo') {
    $lines[] = 'Боксов: ' . field('boxes', 40);
    $lines[] = 'Камеры в боксах: ' . field('cameras', 40);
    $lines[] = 'Тариф: ' . field('plan', 60);
}
$lines[] = '';
$lines[] = 'Форма: ' . ($form === 'demo' ? '«Запишитесь на демо»' : '«Перезвоним за 15 минут»');
$lines[] = 'Время: ' . $when->format('d.m.Y H:i');
$lines[] = 'Страница: ' . field('page', 300);
$lines[] = 'IP: ' . $ip;
$body = implode("\r\n", $lines);

try {
    smtp_send($cfg, $cfg['mail_to'], $subject, $body);
} catch (Exception $e) {
    error_log('[r8-lead] ' . $e->getMessage());
    reply(502, false, 'Не удалось отправить заявку.');
}

reply(200, true, 'Спасибо! Перезвоним в течение 15 минут.');


/* ====================== минимальный SMTP-клиент ====================== */

function mime_header($s) {
    return '=?UTF-8?B?' . base64_encode($s) . '?=';
}

function smtp_read($fp) {
    $data = '';
    while (($line = fgets($fp, 1024)) !== false) {
        $data .= $line;
        if (strlen($line) < 4 || $line[3] === ' ') break;
    }
    return array((int)substr($data, 0, 3), $data);
}

function smtp_cmd($fp, $line, $expect, $what) {
    if ($line !== null) fwrite($fp, $line . "\r\n");
    list($code, $resp) = smtp_read($fp);
    if (!in_array($code, $expect, true)) {
        throw new Exception('SMTP ' . $what . ': ' . trim($resp));
    }
}

function smtp_send($cfg, $to, $subject, $body) {
    $secure = $cfg['smtp_secure']; // 'ssl' (порт 465) или 'tls' (STARTTLS, порт 587)
    $ctx = stream_context_create(array('ssl' => array(
        'verify_peer'      => true,
        'verify_peer_name' => true,
        'peer_name'        => $cfg['smtp_host'],
    )));
    $remote = ($secure === 'ssl' ? 'ssl://' : 'tcp://') . $cfg['smtp_host'] . ':' . $cfg['smtp_port'];
    $errno = 0; $errstr = '';
    $fp = @stream_socket_client($remote, $errno, $errstr, 15, STREAM_CLIENT_CONNECT, $ctx);
    if (!$fp) {
        throw new Exception("connect $remote: $errstr ($errno)");
    }
    stream_set_timeout($fp, 15);

    $helo = srv('SERVER_NAME', 'webmoika.kz');
    smtp_cmd($fp, null, array(220), 'greeting');
    smtp_cmd($fp, "EHLO $helo", array(250), 'EHLO');
    if ($secure === 'tls') {
        smtp_cmd($fp, 'STARTTLS', array(220), 'STARTTLS');
        if (!stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
            throw new Exception('STARTTLS handshake failed');
        }
        smtp_cmd($fp, "EHLO $helo", array(250), 'EHLO after TLS');
    }
    smtp_cmd($fp, 'AUTH LOGIN', array(334), 'AUTH');
    smtp_cmd($fp, base64_encode($cfg['smtp_user']), array(334), 'AUTH user');
    smtp_cmd($fp, base64_encode($cfg['smtp_pass']), array(235), 'AUTH password');
    smtp_cmd($fp, 'MAIL FROM:<' . $cfg['smtp_user'] . '>', array(250), 'MAIL FROM');
    smtp_cmd($fp, 'RCPT TO:<' . $to . '>', array(250, 251), 'RCPT TO');
    smtp_cmd($fp, 'DATA', array(354), 'DATA');

    $at = strrchr($cfg['smtp_user'], '@');
    $domain = $at ? substr($at, 1) : 'webmoika.kz';
    $headers = array(
        'Date: ' . date('r'),
        'From: ' . mime_header($cfg['from_name']) . ' <' . $cfg['smtp_user'] . '>',
        'To: <' . $to . '>',
        'Subject: ' . mime_header($subject),
        'Message-ID: <' . md5(uniqid('', true) . mt_rand()) . '@' . $domain . '>',
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
    );
    // base64-тело: в нём нет строк, начинающихся с точки, dot-stuffing не нужен
    $msg = implode("\r\n", $headers) . "\r\n\r\n" . rtrim(chunk_split(base64_encode($body), 76, "\r\n")) . "\r\n.";
    smtp_cmd($fp, $msg, array(250), 'message');
    fwrite($fp, "QUIT\r\n");
    fclose($fp);
}
