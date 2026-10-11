import { useCallback, useEffect, useRef, useState } from "react";
import { useMotionValue } from "motion/react";
import { learnerContext } from "./study";
import type { AIState } from "./components/smoothui/ai-core";

type TutorState = "idle" | "connecting" | "listening" | "thinking" | "speaking" | "error";
type StartOptions = { title: string; sourceExcerpt: string; locale: "pt-BR" | "en-US" };
const MAX_VOICE_SESSION_MS = 3 * 60 * 1000;

type SessionResources = {
  pc: RTCPeerConnection;
  dc: RTCDataChannel;
  input: MediaStream;
  audio: HTMLAudioElement;
  context: AudioContext | null;
  inputAnalyser: AnalyserNode | null;
  outputAnalyser: AnalyserNode | null;
  meter: number | null;
  timer: number | null;
};

type EventPayload = {
  type?: string;
  delta?: string;
  transcript?: string;
  error?: { message?: string };
};

/**
 * OpenAI Realtime speech-to-speech via WebRTC.
 *
 * All API keys are held by the server. The browser sends only the SDP offer
 * through the paid, authenticated same-origin InstantStudy BFF.
 */
export function useRealtimeTutor() {
  const [state, setState] = useState<TutorState>("idle");
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const amplitude = useMotionValue(0);
  const current = useRef<SessionResources | null>(null);
  const starting = useRef(false);
  const cancelled = useRef(false);
  const stateRef = useRef<TutorState>("idle");
  const setTutorState = useCallback((next: TutorState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const release = useCallback(() => {
    cancelled.current = true;
    const session = current.current;
    current.current = null;
    if (session) {
      if (session.timer !== null) window.clearTimeout(session.timer);
      if (session.meter !== null) window.clearInterval(session.meter);
      session.dc.onmessage = null;
      session.dc.onopen = null;
      session.dc.onclose = null;
      if (session.dc.readyState === "open") {
        try { session.dc.send(JSON.stringify({ type: "response.cancel" })); } catch { /* closed */ }
      }
      try { session.dc.close(); } catch { /* closed */ }
      session.input.getTracks().forEach(track => track.stop());
      try { session.pc.close(); } catch { /* closed */ }
      session.audio.pause();
      session.audio.srcObject = null;
      void session.context?.close().catch(() => undefined);
    }
    amplitude.set(0);
    starting.current = false;
  }, [amplitude]);

  const stop = useCallback(() => {
    release();
    setTutorState("idle");
  }, [release, setTutorState]);

  useEffect(() => () => release(), [release]);

  const start = useCallback(async ({ title, sourceExcerpt, locale }: StartOptions) => {
    if (starting.current || current.current) return;
    const identity = learnerContext();
    if (!identity.accountUserId || !identity.accountAccessToken) {
      setTutorState("error");
      setError(locale === "pt-BR"
        ? "Conecte sua conta InstantStudy com plano Plus ou Unlimited para usar voz em tempo real."
        : "Sign in with an InstantStudy Plus or Unlimited account to use real-time voice.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
      setTutorState("error");
      setError(locale === "pt-BR" ? "WebRTC/microfone indisponível neste navegador." : "WebRTC/microphone unavailable in this browser.");
      return;
    }

    starting.current = true;
    cancelled.current = false;
    setError("");
    setTranscript("");
    setTutorState("connecting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      if (cancelled.current) { stream.getTracks().forEach(track => track.stop()); return; }
      const pc = new RTCPeerConnection();
      const dc = pc.createDataChannel("oai-events");
      const audio = new Audio();
      audio.autoplay = true;
      const resources: SessionResources = {
        pc, dc, input: stream, audio, context: null,
        inputAnalyser: null, outputAnalyser: null, meter: null, timer: null,
      };
      current.current = resources;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      pc.ontrack = event => {
        if (current.current !== resources) return;
        const remote = event.streams[0] || new MediaStream([event.track]);
        audio.srcObject = remote;
        void audio.play().catch(() => undefined);
        if (resources.context && !resources.outputAnalyser) {
          const analyser = resources.context.createAnalyser();
          analyser.fftSize = 512;
          resources.context.createMediaStreamSource(remote).connect(analyser);
          resources.outputAnalyser = analyser;
        }
      };
      dc.onopen = () => {
        if (current.current !== resources) return;
        setTutorState("listening");
        // No artificial assistant introduction: the learner starts with speech.
      };
      dc.onmessage = event => {
        if (current.current !== resources) return;
        let parsed: EventPayload;
        try { parsed = JSON.parse(String(event.data)) as EventPayload; } catch { return; }
        switch (parsed.type) {
          case "input_audio_buffer.speech_started":
            setTutorState("listening");
            break;
          case "input_audio_buffer.speech_stopped":
          case "response.created":
            setTutorState("thinking");
            break;
          case "response.output_audio.started":
          case "response.audio.started":
          case "response.output_audio_transcript.delta":
          case "response.audio_transcript.delta":
            setTutorState("speaking");
            if (parsed.delta) setTranscript(prev => (prev + parsed.delta).slice(-800));
            break;
          case "response.done":
          case "response.output_audio.done":
            setTutorState("listening");
            break;
          case "conversation.item.input_audio_transcription.completed":
            if (parsed.transcript) setTranscript(parsed.transcript.slice(-800));
            break;
          case "error":
            setError(parsed.error?.message || "Realtime voice error");
            setTutorState("error");
            break;
        }
      };
      dc.onclose = () => {
        if (current.current === resources) stop();
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "closed") {
          if (current.current === resources) {
            setError("Realtime connection closed.");
            release();
            setTutorState("error");
          }
        }
      };

      // This is real microphone/audio amplitude, not the simulated docs animation.
      try {
        const context = new AudioContext();
        const analyser = context.createAnalyser();
        analyser.fftSize = 512;
        context.createMediaStreamSource(stream).connect(analyser);
        resources.context = context;
        resources.inputAnalyser = analyser;
        const buffer = new Float32Array(512);
        resources.meter = window.setInterval(() => {
          if (current.current !== resources) return;
          const active = stateRef.current === "speaking"
            ? resources.outputAnalyser || resources.inputAnalyser
            : resources.inputAnalyser;
          if (!active) return;
          active.getFloatTimeDomainData(buffer);
          let sum = 0;
          for (const n of buffer) sum += n * n;
          const volume = Math.min(1, Math.sqrt(sum / buffer.length) * 4);
          amplitude.set(amplitude.get() * .5 + volume * .5);
        }, 60);
      } catch { /* Voice remains usable without audio metering. */ }

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (cancelled.current || current.current !== resources) return;
      const payload = {
        action: "realtime_offer",
        ...identity,
        sdp: pc.localDescription?.sdp || offer.sdp,
        title: title.slice(0, 160),
        sourceExcerpt: sourceExcerpt.slice(0, 6000),
        locale,
      };
      const response = await fetch("/api/study", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(35_000),
      });
      const answer = await response.json().catch(() => ({})) as {
        sdp?: string; error?: string; message?: string; remainingStartsToday?: number;
      };
      if (!response.ok || !answer.sdp) throw new Error(answer.message || answer.error || "realtime_offer_failed");
      if (cancelled.current || current.current !== resources) return;
      setRemaining(typeof answer.remainingStartsToday === "number" ? answer.remainingStartsToday : null);
      await pc.setRemoteDescription({ type: "answer", sdp: answer.sdp });
      if (cancelled.current || current.current !== resources) return;
      resources.timer = window.setTimeout(() => {
        stop();
        setError(locale === "pt-BR"
          ? "Sessão encerrada no limite de 3 minutos para controlar o consumo."
          : "Session ended at the 3-minute limit to control usage.");
      }, MAX_VOICE_SESSION_MS);
    } catch (e) {
      const message = e instanceof Error ? e.message : "realtime_session_unavailable";
      release();
      setError(message);
      setTutorState("error");
    } finally {
      starting.current = false;
    }
  }, [amplitude, release, setTutorState, stop]);

  return {
    state, error, transcript, remainingStartsToday: remaining, amplitude,
    start, stop,
    active: state === "connecting" || state === "listening" || state === "thinking" || state === "speaking",
  };
}
