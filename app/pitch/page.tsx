import PitchDeck from "@/components/PitchDeck";

export const dynamic = "force-static";

export default function PitchPage() {
  return (
    <PitchDeck
      repoUrl="https://github.com/ZKSystemId/ur4gent"
      liveUrl="https://ur4gent.vercel.app"
      demoUrl="https://youtube.com/your-demo-video"
    />
  );
}

