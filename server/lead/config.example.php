<?php
/*
 * Скопируйте этот файл в config.php (в той же папке на хостинге) и впишите пароль ящика.
 * config.php НЕ кладите в репозиторий: он в .gitignore, а репозиторий публичный.
 */
return [
    // Куда приходят заявки
    'mail_to'   => 'info@webmoika.kz',
    // Имя отправителя в письме
    'from_name' => 'Сайт R8 CRM',

    // SMTP ящика info@webmoika.kz (почта на хостинге hoster.kz)
    'smtp_host'   => 'mail.webmoika.kz',
    'smtp_port'   => 465,
    'smtp_secure' => 'ssl',          // 'ssl' для 465, 'tls' для 587
    'smtp_user'   => 'info@webmoika.kz',
    'smtp_pass'   => 'ПАРОЛЬ_ОТ_ЯЩИКА',

    // С каких сайтов принимать заявки
    'allowed_origins' => [
        'https://ilyasqa02.github.io',
        'https://webmoika.kz',
        'https://www.webmoika.kz',
    ],

    // Не больше rate_max заявок с одного IP за rate_window_sec секунд
    'rate_max'        => 5,
    'rate_window_sec' => 600,
];
