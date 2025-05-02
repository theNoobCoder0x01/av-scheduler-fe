"use client";

import { ICalendarEvent } from "@/lib/types";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../store";

interface EventsState {
  events: ICalendarEvent[];
}

const initialState: EventsState = {
  events: [],
};

export const eventsSlice = createSlice({
  name: "events",
  initialState,
  reducers: {
    setEvents: (state, action: PayloadAction<ICalendarEvent[]>) => {
      state.events = action.payload;
    },
    clearEvents: (state) => {
      state.events = [];
    },
  },
});

export const { setEvents, clearEvents } = eventsSlice.actions;
export const selectEvents = (state: RootState) => state.events.events;
export default eventsSlice.reducer;
