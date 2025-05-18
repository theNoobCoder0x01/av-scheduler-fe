"use client";
import Header from "@/components/header";
import MainView from "@/components/main-view";

import { overrideConsole } from "@/lib/override-console";
import { Calendar } from "lucide-react";

overrideConsole(); // Call at module level (runs in Node.js and in browser)

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-6">
        <div className="flex flex-col items-center justify-center max-w-5xl mx-auto">
          <div className="w-full text-center mb-8">
            <div className="flex flex-col items-center justify-center">
              <div className="flex items-center mb-4">
                <Calendar className="h-8 w-8 mr-2 text-primary" />
                <h1 className="text-3xl font-bold">BAPS Music Scheduler</h1>
              </div>
              <p className="text-muted-foreground max-w-2xl">
                Upload your calendar file, schedule actions, and automate your
                media playback with VLC. Perfect for creating dynamic playlists
                tied to your calendar events.
              </p>
            </div>
          </div>
          <MainView />
        </div>
      </main>
      <footer className="py-4 border-t">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} BAPS Music Scheduler</p>
        </div>
      </footer>
    </div>
  );
}
