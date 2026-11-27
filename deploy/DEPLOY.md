# Daily Short on the VPS

Every night at 01:00 (Tashkent) the VPS writes a new "In Our Town, Never…" story,
voices it, reviews the stills, renders it, checks it, and sends the MP4, the cover, the
title, the description and a first-comment idea to the Telegram bot
@untold_stories_youtube_bot. You upload it to YouTube yourself.

## Where things are

- Server: Contabo Cloud VPS 4 (4 vCPU, 8 GB, 4 GB swap). Its `user@address` is in
  `deploy/host` (gitignored).
- Code: `/home/shorts/app`, run as the user `shorts`. Secrets: `/home/shorts/app/.env`
  (`CLAUDE_CODE_OAUTH_TOKEN`, `ELEVENLABS_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`).
- Schedule: `shorts-daily.timer` starts `shorts-daily.service`.
- Logs: `/home/shorts/app/logs/<date>.log`.
- Limits: the service is capped at 4.5 GB RAM, 3 CPUs and low priority, because the same
  box runs other services.

## Everyday commands (on the VPS as root)

    systemctl list-timers shorts-daily.timer        # next run
    systemctl start shorts-daily.service            # run now (takes 1-2 hours)
    journalctl -u shorts-daily -n 50                # service output
    tail -f /home/shorts/app/logs/$(date +%F).log   # the run's log

Resume a run that failed half way (you get a Telegram message with the step):

    su - shorts -c 'cd app && REMOTION_GL=swangle python3 tools/daily.py --resume daily-YYYY-MM-DD'

## Updating the code

From the Mac checkout: `deploy/sync.sh`. It copies the code (not `.env`, stories' builds
or logs) and reinstalls the systemd units. Run `npm ci` on the server after changing
`package.json`.

## Limits to know

- The writer and reviewer run on the Claude Pro subscription. If a run hits the usage
  limit it fails and tells you; resume it later.
- ElevenLabs: one take is about 2,000 characters a day.
- Builds are large: delete `stories/*/build` of old stories now and then.
