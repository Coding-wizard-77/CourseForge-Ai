import { create } from "zustand";

interface CourseState {
  activeModuleIndex: number;
  activeVideoIndex: number;
  setActiveLesson: (moduleIndex: number, videoIndex?: number) => void;
}

export const useCourseStore = create<CourseState>((set) => ({
  activeModuleIndex: 0,
  activeVideoIndex: 0,
  setActiveLesson: (activeModuleIndex, activeVideoIndex = 0) =>
    set({
      activeModuleIndex,
      activeVideoIndex
    })
}));
