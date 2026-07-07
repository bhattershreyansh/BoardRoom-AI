import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  Clock,
  Loader2,
  Mic,
  MicOff,
  PhoneOff,
  ShieldCheck,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/logo";
import { AmbientBackground } from "@/components/brand/ambient-background";
import { Button } from "@/components/ui/button";
import { Waveform } from "@/components/interview/waveform";
import { useCreateToken, useSessions } from "@/hooks/use-sessions";
import { cn } from "@/lib/utils";
import { Room, RoomEvent, Track } from "livekit-client";

export const Route = createFileRoute("/interview/$session_id")({
  head: () => ({
    meta: [
      { title: "Executive Interview — BoardRoom AI" },
      { name: "robots", content: "noindex" },
      {
        name: "description",
        content: "Your voice-based AI executive interview session.",
      },
    ],
  }),
  component: InterviewPage,
});

type CallStage = "waiting" | "connecting" | "active" | "ended";
type ConnState = "waiting" | "connected" | "disconnected";

function InterviewPage() {
  const { session_id } = Route.useParams();
  const navigate = useNavigate();

  const { data: sessions } = useSessions();
  const session = sessions?.find((s) => s.session_id === session_id);
  const candidateName = session?.candidate_name ?? "Candidate";

  const [stage, setStage] = useState<CallStage>("waiting");
  const [conn, setConn] = useState<ConnState>("waiting");
  const [muted, setMuted] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [speaker, setSpeaker] = useState<"ai" | "candidate" | "idle">("idle");

  const createToken = useCreateToken();
  const roomRef = useRef<Room | null>(null);
  const audioElementsRef = useRef<HTMLAudioElement[]>([]);

  // Disconnect on component unmount to free up the microphone
  useEffect(() => {
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
      }
      audioElementsRef.current.forEach((el) => el.remove());
    };
  }, []);

  // Force disconnect if backend marks session as completed mid-call
  useEffect(() => {
    if (session?.status === "completed" && roomRef.current) {
      roomRef.current.disconnect();
      audioElementsRef.current.forEach((el) => el.remove());
    }
  }, [session?.status]);

  const handleStart = async () => {
    setStage("connecting");
    try {
      const res = await createToken.mutateAsync({
        sessionId: session_id,
        participantName: candidateName,
      });
      setToken(res.token);

      const room = new Room({
        publishDefaults: {
          audioPreset: "music",
        },
      });
      roomRef.current = room;

      room.on(RoomEvent.Connected, () => {
        setConn("connected");
        setStage("active");
        toast.success("Connected to your interview");
      });

      room.on(RoomEvent.Disconnected, () => {
        setConn("disconnected");
        setStage("ended");
      });

      // Attach remote participant audio track (so candidate can hear the AI agent)
      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Audio) {
          const element = track.attach();
          document.body.appendChild(element);
          audioElementsRef.current.push(element);
        }
      });

      // Detach audio track on unsubscribe
      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        if (track.kind === Track.Kind.Audio) {
          track.detach().forEach((el) => {
            el.remove();
            audioElementsRef.current = audioElementsRef.current.filter((item) => item !== el);
          });
        }
      });

      // Sync active speaker state for waveform animations
      const handleSpeakingUpdate = () => {
        if (room.localParticipant.isSpeaking) {
          setSpeaker("candidate");
        } else {
          const isRemoteSpeaking = Array.from(room.remoteParticipants.values()).some(
            (p) => p.isSpeaking
          );
          if (isRemoteSpeaking) {
            setSpeaker("ai");
          } else {
            setSpeaker("idle");
          }
        }
      };

      room.on(RoomEvent.IsSpeakingChanged, handleSpeakingUpdate);

      // Connect to LiveKit server URL returned by backend
      const connectionUrl = res.url || "ws://localhost:7880";
      await room.connect(connectionUrl, res.token);
      
      // Auto-publish microphone input
      await room.localParticipant.setMicrophoneEnabled(true);
    } catch (err) {
      console.error("LiveKit connection error:", err);
      setStage("waiting");
      setConn("disconnected");
      toast.error("Could not connect to voice server. Verify microphone permissions.");
    }
  };

  const handleEndCall = () => {
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }
    audioElementsRef.current.forEach((el) => el.remove());
    audioElementsRef.current = [];
    setToken(null);
    setConn("disconnected");
    setSpeaker("idle");
    setStage("ended");
  };

  const handleToggleMute = async () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    if (roomRef.current) {
      await roomRef.current.localParticipant.setMicrophoneEnabled(!nextMuted);
    }
  };

  const micState = muted ? "Muted" : conn === "connected" ? "Active" : "Waiting";

  return (
    <AmbientBackground className="flex flex-col">
      <InterviewHeader conn={conn} micState={micState} />

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <AnimatePresence mode="wait">
          {session?.status === "completed" || stage === "ended" ? (
            <EndedState key="ended" />
          ) : stage === "waiting" || stage === "connecting" ? (
            <WaitingRoom
              key="waiting"
              candidateName={candidateName}
              connecting={stage === "connecting"}
              onStart={handleStart}
            />
          ) : (
            <ActiveInterview
              key="active"
              candidateName={candidateName}
              speaker={speaker}
              muted={muted}
              onToggleMute={handleToggleMute}
              onEnd={handleEndCall}
            />
          )}
        </AnimatePresence>
      </main>
    </AmbientBackground>
  );
}

function InterviewHeader({
  conn,
  micState,
}: {
  conn: ConnState;
  micState: string;
}) {
  const connMeta =
    conn === "connected"
      ? { label: "Connected", dot: "bg-success" }
      : conn === "disconnected"
        ? { label: "Disconnected", dot: "bg-destructive" }
        : { label: "Waiting to Connect", dot: "bg-warning" };

  const micActive = micState === "Active";

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
        <Logo size="sm" showText />
        <div className="flex items-center gap-2.5">
          <Pill
            icon={<span className={cn("h-2 w-2 rounded-full", connMeta.dot)} />}
            label={connMeta.label}
          />
          <Pill
            icon={
              micActive ? (
                <Mic className="h-3.5 w-3.5 text-success" />
              ) : (
                <MicOff className="h-3.5 w-3.5 text-muted-foreground" />
              )
            }
            label={micState}
          />
        </div>
      </div>
    </header>
  );
}

function Pill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1.5 shadow-sm">
      {icon}
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

function WaitingRoom({
  candidateName,
  connecting,
  onStart,
}: {
  candidateName: string;
  connecting: boolean;
  onStart: () => void;
}) {
  const instructions = [
    "1. Ensure a quiet, professional environment.",
    "2. Follow the autonomous interviewer's prompts.",
    "3. Speak clearly and confidently.",
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-2xl px-6 py-12 text-center"
    >
      <h2 className="mb-6 text-2xl font-serif text-foreground">
        Welcome, {candidateName}
      </h2>
      
      <h1 className="mb-10 text-4xl leading-tight font-serif text-foreground sm:text-5xl">
        Welcome to BoardRoom AI.<br />
        Your Elite Executive<br />
        Interview Awaits.
      </h1>

      <ul className="mx-auto mb-12 flex max-w-md flex-col">
        {instructions.map((text, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.1 }}
            className={cn(
              "py-4 text-sm font-medium text-foreground sm:text-base",
              i === 0 ? "border-y border-border/80" : "border-b border-border/80"
            )}
          >
            {text}
          </motion.li>
        ))}
      </ul>

      <Button
        size="xl"
        className="mx-auto flex w-full max-w-md items-center justify-center rounded-xl bg-primary py-7 text-lg font-serif text-[#d6b785] shadow-lg transition-all hover:bg-primary/90"
        onClick={onStart}
        disabled={connecting}
      >
        {connecting ? (
          <>
            <Loader2 className="mr-3 h-5 w-5 animate-spin text-[#d6b785]" />
            Connecting…
          </>
        ) : (
          "Proceed to Interview"
        )}
      </Button>
    </motion.div>
  );
}

function ActiveInterview({
  candidateName,
  speaker,
  muted,
  onToggleMute,
  onEnd,
}: {
  candidateName: string;
  speaker: "ai" | "candidate" | "idle";
  muted: boolean;
  onToggleMute: () => void;
  onEnd: () => void;
}) {
  const speaking = !muted && speaker !== "idle";
  const label =
    speaker === "ai"
      ? "AI Interviewer is speaking"
      : speaker === "candidate"
        ? `${candidateName} is speaking`
        : "Listening…";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-2xl"
    >
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-xl sm:p-10">
        <div className="relative flex flex-col items-center">
          <motion.div
            key={speaker}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
              className={cn(
                "mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium shadow-sm transition-all",
                speaker === "ai"
                  ? "text-primary"
                  : speaker === "candidate"
                    ? "text-accent-foreground"
                    : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full animate-pulse",
                  speaker === "ai"
                    ? "bg-primary"
                    : speaker === "candidate"
                      ? "bg-accent-foreground"
                      : "bg-muted-foreground",
                )}
              />
            {label}
          </motion.div>

          {/* Orb + waveform */}
          <div className="relative mb-8 grid place-items-center">
            <motion.div
              animate={{ scale: speaking ? [1, 1.08, 1] : 1, opacity: speaking ? [0.4, 0.7, 0.4] : 0.3 }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className={cn(
                "absolute h-40 w-40 rounded-full blur-2xl",
                speaker === "candidate" ? "bg-accent/40" : "bg-primary/40",
              )}
            />
            <div className="relative w-full max-w-md">
              <Waveform active={speaking} speaker={speaker} />
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            <button
              onClick={onToggleMute}
              className={cn(
                "grid h-14 w-14 place-items-center rounded-full border transition-all",
                muted
                  ? "border-destructive/40 bg-destructive/15 text-destructive"
                  : "border-border bg-secondary/60 text-foreground hover:bg-secondary",
              )}
              aria-label={muted ? "Unmute microphone" : "Mute microphone"}
            >
              {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>

            <Button
              variant="destructive"
              size="lg"
              className="rounded-full px-7"
              onClick={onEnd}
            >
              <PhoneOff className="h-4 w-4" />
              End Call
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            {muted ? "Your microphone is muted" : "Your microphone is live"}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function EndedState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-md rounded-3xl border border-border bg-card p-10 text-center shadow-xl"
    >
      <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-success/15 text-success shadow-sm">
        <PhoneOff className="h-7 w-7" />
      </div>
      <h1 className="text-2xl font-serif text-foreground">Interview Concluded</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Thank you. Your responses have been recorded. You may close this tab.
      </p>
    </motion.div>
  );
}
