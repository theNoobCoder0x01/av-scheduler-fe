"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { parseIcsFile } from "@/lib/ics-parser";
import { useAppDispatch } from "@/lib/store/hooks";
import { setEvents } from "@/lib/store/slices/eventsSlice";
import { isFullDayEvent } from "@/lib/utils";
import { FileText, Upload } from "lucide-react";
import { useState } from "react";

interface FileUploaderProps {
  onEventsLoaded: () => void;
}

export default function FileUploader({ onEventsLoaded }: FileUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const dispatch = useAppDispatch();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    if (selectedFile.name.endsWith(".ics")) {
      setFile(selectedFile);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please upload an .ics file",
        variant: "destructive",
      });
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  };

  const handleParse = async () => {
    if (!file) return;

    setIsLoading(true);
    try {
      let events = await parseIcsFile(file);
      console.log("Parsed events:", events);
      events = events.map((event) => {
        const startDate = new Date(event.start);
        const endDate = new Date(event.end);
        const startEpoch = Math.floor(startDate.getTime() / 1000);
        const endEpoch = Math.floor(endDate.getTime() / 1000);
        return {
          ...event,
          start: startEpoch,
          end: endEpoch,
          isFullDayEvent: isFullDayEvent(startDate, endDate),
        };
      });

      dispatch(setEvents(events));
      onEventsLoaded();
      toast({
        title: "Calendar loaded",
        description: `${events.length} events found`,
        variant: "default",
      });
    } catch (error) {
      console.error("Error parsing ICS file:", error);
      toast({
        title: "Error parsing file",
        description:
          "There was an error parsing the calendar file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div
          className={`border-2 border-dashed rounded-lg p-10 text-center ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/20"
          } transition-colors duration-200`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="rounded-full bg-muted p-3">
              <Upload className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold">
              Upload your .ics calendar file
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Drag and drop your file here, or click the button below to browse
            </p>
            <input
              id="file-upload"
              type="file"
              accept=".ics"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              variant="secondary"
              onClick={() => document.getElementById("file-upload")?.click()}
            >
              Select File
            </Button>
          </div>
        </div>

        {file && (
          <div className="mt-6">
            <div className="flex items-center justify-between p-4 border rounded-md bg-muted/50">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <span className="font-medium truncate max-w-[250px]">
                  {file.name}
                </span>
              </div>
              <Button
                variant="default"
                onClick={handleParse}
                disabled={isLoading}
              >
                {isLoading ? "Processing..." : "Process Calendar"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
