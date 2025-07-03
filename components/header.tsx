"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Clock, Github, HelpCircle, Settings, Play } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import SettingsForm from "@/components/settings-form";

export default function Header() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const [formattedTime, setFormattedTime] = useState("");
  const epochTimestamp = Math.floor(currentTime.getTime() / 1000);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setFormattedTime(now.toLocaleTimeString());
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleOpenMediaPlayer = () => {
    if (typeof window !== "undefined" && window.electron?.openMediaPlayer) {
      window.electron.openMediaPlayer();
    } else {
      // Fallback for web environment - open in new tab
      window.open("/media-player", "_blank");
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-3 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-bold text-xl">BAPS Music Scheduler</span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-background hover:bg-accent cursor-default">
                  <Clock className="h-[1.2rem] w-[1.2rem] text-muted-foreground" />
                  <span className="font-medium">
                    {formattedTime ?? "Loading..."}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Epoch: {epochTimestamp}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={handleOpenMediaPlayer}>
                  <Play className="h-[1.2rem] w-[1.2rem]" />
                  <span className="sr-only">Open Media Player</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Open Media Player</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Settings className="h-[1.2rem] w-[1.2rem]" />
                    <span className="sr-only">Settings</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <SettingsForm />
                </DialogContent>
              </Dialog>
              <TooltipContent>
                <p>Settings</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" asChild>
                  <Link
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Github className="h-[1.2rem] w-[1.2rem]" />
                    <span className="sr-only">GitHub</span>
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View source code</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon">
                  <HelpCircle className="h-[1.2rem] w-[1.2rem]" />
                  <span className="sr-only">Help</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Help & documentation</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}