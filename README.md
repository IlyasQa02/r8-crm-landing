# R8 CRM — лендинг для автомоек

Статический лендинг: обычные HTML, CSS и JS. Сборка, фреймворки и зависимости не нужны.

Демо: https://ilyasqa02.github.io/r8-crm-landing/

## Структура

```
index.html            — разметка страницы
css/style.css         — все стили
js/main.js            — вся логика (анимации, табы, калькулятор, формы, видео)
js/analytics.js       — счётчики и пиксели (GA4, Google Ads, Яндекс Метрика, Meta, TikTok) и цели
img/og-image.png      — картинка-превью ссылки в мессенджерах и соцсетях (1200×630)
robots.txt, sitemap.xml — для поисковиков
img/logo-r8-dark.png  — логотип для светлого фона (шапка)
img/logo-r8-light.png — логотип для тёмного фона (подвал)
img/favicon.png       — иконка вкладки браузера
img/camera-box.jpg    — кадр с камеры в блоке «Мойка мимо кассы»
server/lead/send.php  — отправка заявок на почту (кладётся на хостинг webmoika.kz, не на GitHub Pages)
```

## Как разместить на сайте

1. Скопируйте содержимое репозитория в нужную папку на сервере. Структура папок должна остаться как есть: пути к файлам относительные.
2. Страницу нужно открывать по `https://`. Через `file://` не загрузится видео с YouTube.
3. Если на сайте настроен заголовок Content-Security-Policy, разрешите в нём следующие адреса:
   - `frame-src https://www.youtube-nocookie.com` — видео;
   - `style-src https://fonts.googleapis.com`;
   - `font-src https://fonts.gstatic.com` — шрифт Onest.

## Что нужно доделать при запуске

### 1. Формы заявок -> почта info@webmoika.kz

Обе формы отправляют заявку на почту **info@webmoika.kz** через SMTP этого ящика:

| Форма | Где на странице | Тема письма | Поля |
|---|---|---|---|
| `#cpForm` | Всплывающая форма «Перезвоним за 15 минут» в углу | «Обратный звонок R8 CRM: <телефон>» | имя, телефон |
| `#lead` | Блок «Запишитесь на демо» внизу | «Заявка на демо R8 CRM: <телефон>» | имя, телефон, боксов, камеры, тариф |

GitHub Pages не выполняет PHP, поэтому сам отправщик лежит на хостинге webmoika.kz (hoster.kz, Plesk), а страница шлёт на него запрос: `LEAD_URL = 'https://webmoika.kz/lead/send.php'` в `js/main.js`.

**Установка на хостинг (один раз):**

1. В Plesk -> «Файлы» создайте в `httpdocs` папку `lead` и загрузите туда `server/lead/send.php`.
2. Рядом создайте `config.php`: скопируйте `server/lead/config.example.php` и впишите пароль ящика info@webmoika.kz в `smtp_pass`. **`config.php` в репозиторий не коммитить** (он в `.gitignore`, репозиторий публичный).
3. Отправьте пробную заявку с https://ilyasqa02.github.io/r8-crm-landing/ из обеих форм и проверьте ящик.

Если заявка не отправилась, клиент видит ошибку с номером телефона, а причина пишется в лог ошибок PHP в Plesk (строки `[r8-lead]`).

Защита от спама: скрытое поле-ловушка `website` и не больше 5 заявок с одного IP за 10 минут (`rate_max`, `rate_window_sec` в `config.php`). Заявки принимаются только со страниц из `allowed_origins`. Если лендинг переедет на другой адрес, добавьте его туда.

### 2. Ссылки-заглушки

- Кнопки «App Store» и «Google Play» в блоке «Клиентский сервис» (`.stores` в `index.html`) пока никуда не ведут. Нужны ссылки на приложение в магазинах.
- «Политика конфиденциальности» в подвале — пока просто текст. Нужна страница и ссылка на неё.

### 3. Видео

YouTube-ролик `HsANYe8osQo` подключается по клику на обложку (атрибут `data-yt` у `#vposter`). Чтобы поменять ролик, замените ID в этом атрибуте.

## SEO и метаданные

В `<head>` страницы уже есть:

- `title` и `description` — заголовок и описание в выдаче Google и Яндекса;
- `canonical`, `robots`, `keywords`, `theme-color`;
- Open Graph и Twitter Card — превью ссылки в WhatsApp, Telegram, Instagram, Facebook (картинка `img/og-image.png`);
- JSON-LD schema.org: организация с контактами, продукт с тарифами в тенге, блок «Вопросы» (FAQPage);
- `robots.txt` и `sitemap.xml`.

**Адрес сайта** — `https://webmoika.kz/`, он прописан в canonical, Open Graph, JSON-LD, `sitemap.xml` и `robots.txt`. Копия на GitHub Pages (`ilyasqa02.github.io/r8-crm-landing/`) тоже указывает canonical на webmoika.kz, поэтому поисковики не посчитают её дублем. В рекламе давайте ссылки только на webmoika.kz.

**Выкладка на webmoika.kz:** после изменений залейте в `httpdocs` на хостинге `index.html`, `robots.txt`, `sitemap.xml`, папки `css`, `js`, `img` (особенно новые `js/analytics.js` и `img/og-image.png`).

**Подключение вебмастеров (один раз):**

1. Google Search Console (search.google.com/search-console) -> «Добавить ресурс» -> «Префикс URL» -> адрес сайта -> способ «Тег HTML». Код из тега вставьте в строку `google-site-verification` в `index.html` и раскомментируйте её. После публикации нажмите «Подтвердить», затем в «Файлы Sitemap» добавьте `sitemap.xml`.
2. Яндекс.Вебмастер (webmaster.yandex.kz) — так же, строка `yandex-verification`, потом «Индексирование -> Файлы Sitemap».
3. Проверить превью ссылки: developers.facebook.com/tools/debug (Facebook/Instagram/WhatsApp), проверить разметку: search.google.com/test/rich-results.

## Аналитика и реклама

ID счётчиков вписываются в `index.html`, в блок `window.R8_TRACKING`. Пустой ID — счётчик не загружается, страница работает как раньше.

| Поле | Где взять |
|---|---|
| `ga4` | Google Analytics -> Администратор -> Потоки данных -> Идентификатор потока `G-…` |
| `googleAds` | Google Ads -> Цели -> Конверсии -> создать конверсию «Сайт» -> «Установить тег вручную»: `AW-…` |
| `googleAdsLead` | там же, часть `send_to` после косой черты: `AW-123/`**`AbCdEf`** |
| `yandexMetrika` | metrika.yandex.ru -> добавить счётчик -> номер счётчика |
| `metaPixel` | Meta Events Manager -> Источники данных -> Пиксель -> ID |
| `tiktokPixel` | TikTok Ads Manager -> Assets -> Events -> Web Events -> Pixel ID |

**Цели**, которые страница отправляет сама (заводить их в кабинетах под этими именами):

| Цель | Когда | Google Analytics | Яндекс Метрика (тип «JavaScript-событие») | Meta / TikTok |
|---|---|---|---|---|
| Заявка | любая форма отправлена успешно | `generate_lead` (+ конверсия Google Ads) | `lead`, а также `lead_callback` / `lead_demo` | `Lead` / `SubmitForm` |
| Клик по телефону | ссылка `tel:` | `phone_click` | `phone_click` | `Contact` |
| Клик по WhatsApp | ссылка `wa.me` | `whatsapp_click` | `whatsapp_click` | `Contact` |
| Клик по почте | ссылка `mailto:` | `email_click` | `email_click` | `Contact` |

В GA4 событие `generate_lead` отметьте как ключевое (Администратор -> События). Для рекламы оптимизируйтесь на цель «Заявка».

**UTM-метки.** Давайте в объявлениях ссылки с метками, например `https://webmoika.kz/?utm_source=instagram&utm_campaign=start`. Полный адрес страницы с метками приходит в письме с заявкой (строка «Страница»), так что видно, из какой рекламы пришёл клиент.

Если на сайте настроен Content-Security-Policy, для счётчиков разрешите `googletagmanager.com`, `google-analytics.com`, `mc.yandex.ru`, `connect.facebook.net`, `analytics.tiktok.com`.

## Контакты на странице

- Телефон: +7 701 722 02 15 (шапка, блок заявки, подвал)
- WhatsApp: https://wa.me/77017220215
- Почта: info@webmoika.kz
- Вход в CRM: https://crm.webmoika.kz
