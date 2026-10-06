# InstantStudy Anki Bridge

This add-on connects a local Anki installation to the remote InstantStudy MCP backend without exposing AnkiConnect to the public internet.

## V1 dependency

Install **AnkiConnect** first.

AnkiConnect add-on code:

```
2055492159
```

Restart Anki after installing it. By default AnkiConnect listens on:

```
http://127.0.0.1:8765
```

## Development install

1. Copy `instantstudy_bridge` into your Anki add-ons directory.
2. Open `Tools -> Add-ons -> InstantStudy Bridge -> Config`.
3. Set:
   - `bridge_server_url`
   - `device_id`
   - `bridge_token`
4. Restart Anki.
5. Keep Anki open while studying through ChatGPT.

For local backend development:

```json
{
  "bridge_server_url": "http://127.0.0.1:8000",
  "device_id": "dev-device",
  "bridge_token": "replace-me",
  "anki_connect_url": "http://127.0.0.1:8765",
  "poll_interval_ms": 1500
}
```

## Security

The bridge only forwards an explicit allow-list of AnkiConnect actions:

- `version`
- `deckNames`
- `findCards`
- `cardsInfo`
- `addNote`
- `answerCards`

There is intentionally no arbitrary AnkiConnect proxy.

## Product packaging

The manual configuration above is development-only. A production release should replace it with:

1. user signs in to InstantStudy;
2. ChatGPT shows a pairing code;
3. user enters the code once in Anki;
4. the add-on receives a revocable device credential;
5. device/account mapping is persisted server-side.
