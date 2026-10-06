from __future__ import annotations

import json
import threading
import urllib.error
import urllib.request
from typing import Any

from aqt import gui_hooks, mw
from aqt.qt import QAction, QMessageBox, QTimer


class InstantStudyBridge:
    def __init__(self) -> None:
        self.timer: QTimer | None = None
        self.busy = False
        self.last_error: str | None = None
        self.last_success: str | None = None

    def config(self) -> dict[str, Any]:
        raw = mw.addonManager.getConfig(__name__) or {}
        return {
            "bridge_server_url": str(
                raw.get("bridge_server_url", "http://127.0.0.1:8000")
            ).rstrip("/"),
            "device_id": str(raw.get("device_id", "dev-device")),
            "bridge_token": str(raw.get("bridge_token", "replace-me")),
            "anki_connect_url": str(
                raw.get("anki_connect_url", "http://127.0.0.1:8765")
            ).rstrip("/"),
            "poll_interval_ms": int(raw.get("poll_interval_ms", 1500)),
        }

    def start(self) -> None:
        if self.timer is not None:
            self.timer.stop()

        self.timer = QTimer(mw)
        self.timer.timeout.connect(self.schedule_poll)
        self.timer.start(self.config()["poll_interval_ms"])

    def stop(self) -> None:
        if self.timer is not None:
            self.timer.stop()
            self.timer = None

    def schedule_poll(self) -> None:
        if self.busy:
            return

        self.busy = True
        threading.Thread(target=self.poll_once, daemon=True).start()

    def poll_once(self) -> None:
        try:
            cfg = self.config()
            payload = self.request_json(
                f'{cfg["bridge_server_url"]}/bridge/poll',
                {
                    "deviceId": cfg["device_id"],
                },
                bearer=cfg["bridge_token"],
                timeout=8,
            )

            command = payload.get("command") if isinstance(payload, dict) else None
            if not command:
                self.last_error = None
                return

            command_id = str(command.get("id", ""))
            action = str(command.get("action", ""))
            params = command.get("params") or {}

            result = None
            error = None

            try:
                result = self.call_anki_connect(action, params)
                self.last_success = action
                self.last_error = None
            except Exception as exc:
                error = str(exc)
                self.last_error = error

            self.request_json(
                f'{cfg["bridge_server_url"]}/bridge/result',
                {
                    "deviceId": cfg["device_id"],
                    "commandId": command_id,
                    "result": result,
                    "error": error,
                },
                bearer=cfg["bridge_token"],
                timeout=8,
            )
        except Exception as exc:
            self.last_error = str(exc)
        finally:
            self.busy = False

    def call_anki_connect(
        self,
        action: str,
        params: dict[str, Any] | None = None,
    ) -> Any:
        allowed = {
            "version",
            "deckNames",
            "findCards",
            "cardsInfo",
            "addNote",
            "answerCards",
        }

        if action not in allowed:
            raise RuntimeError(f"Blocked unsupported AnkiConnect action: {action}")

        cfg = self.config()
        response = self.request_json(
            cfg["anki_connect_url"],
            {
                "action": action,
                "version": 6,
                "params": params or {},
            },
            timeout=12,
        )

        if not isinstance(response, dict):
            raise RuntimeError("Invalid response from AnkiConnect")

        if response.get("error"):
            raise RuntimeError(str(response["error"]))

        return response.get("result")

    @staticmethod
    def request_json(
        url: str,
        payload: dict[str, Any],
        *,
        bearer: str | None = None,
        timeout: int = 10,
    ) -> Any:
        body = json.dumps(payload).encode("utf-8")
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        if bearer:
            headers["Authorization"] = f"Bearer {bearer}"

        request = urllib.request.Request(
            url,
            data=body,
            headers=headers,
            method="POST",
        )

        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                raw = response.read().decode("utf-8")
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(
                f"InstantStudy HTTP {exc.code}: {detail or exc.reason}"
            ) from exc
        except urllib.error.URLError as exc:
            raise RuntimeError(f"InstantStudy connection failed: {exc.reason}") from exc

        return json.loads(raw) if raw else {}


bridge = InstantStudyBridge()


def show_status() -> None:
    cfg = bridge.config()

    if bridge.last_error:
        state = f"Disconnected\n\nLast error:\n{bridge.last_error}"
    elif bridge.last_success:
        state = f"Connected\n\nLast action: {bridge.last_success}"
    else:
        state = "Waiting for InstantStudy commands."

    QMessageBox.information(
        mw,
        "InstantStudy",
        (
            f"{state}\n\n"
            f'Device: {cfg["device_id"]}\n'
            f'Server: {cfg["bridge_server_url"]}\n'
            f'AnkiConnect: {cfg["anki_connect_url"]}'
        ),
    )


def on_profile_open() -> None:
    bridge.start()


def on_profile_close() -> None:
    bridge.stop()


action = QAction("InstantStudy status", mw)
action.triggered.connect(show_status)
mw.form.menuTools.addAction(action)

gui_hooks.profile_did_open.append(on_profile_open)
gui_hooks.profile_will_close.append(on_profile_close)
